/**
 * Statistical Tools API Endpoints
 */

const { pool } = require('../config/database');
const stats = require('../utils/statistics');
const multer = require('multer');
const csv = require('csv-parse/sync');

// ============ DATASETS ============

async function getDatasets(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, description, columns, row_count, created_by, created_at, updated_at
       FROM stat_datasets ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching datasets:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getDataset(req, res) {
  try {
    const { id } = req.params;

    const datasetResult = await pool.query(
      'SELECT * FROM stat_datasets WHERE id = $1', [id]
    );

    if (datasetResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dataset not found' });
    }

    const rowsResult = await pool.query(
      'SELECT row_index, row_data FROM stat_dataset_rows WHERE dataset_id = $1 ORDER BY row_index',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...datasetResult.rows[0],
        rows: rowsResult.rows.map(r => r.row_data)
      }
    });
  } catch (error) {
    console.error('Error fetching dataset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function createDataset(req, res) {
  const client = await pool.connect();
  try {
    const { name, description, columns, rows } = req.body;
    const userId = req.user?.id;

    await client.query('BEGIN');

    const datasetResult = await client.query(
      `INSERT INTO stat_datasets (name, description, columns, row_count, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description, columns || [], rows?.length || 0, userId]
    );

    const datasetId = datasetResult.rows[0].id;

    if (rows && rows.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        await client.query(
          'INSERT INTO stat_dataset_rows (dataset_id, row_index, row_data) VALUES ($1, $2, $3)',
          [datasetId, i, rows[i]]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, data: datasetResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating dataset:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

async function updateDataset(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { name, description, columns, rows } = req.body;

    await client.query('BEGIN');

    await client.query(
      `UPDATE stat_datasets SET name = $1, description = $2, columns = $3, row_count = $4, updated_at = NOW()
       WHERE id = $5`,
      [name, description, columns, rows?.length || 0, id]
    );

    await client.query('DELETE FROM stat_dataset_rows WHERE dataset_id = $1', [id]);

    if (rows && rows.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        await client.query(
          'INSERT INTO stat_dataset_rows (dataset_id, row_index, row_data) VALUES ($1, $2, $3)',
          [id, i, rows[i]]
        );
      }
    }

    await client.query('COMMIT');

    const result = await pool.query('SELECT * FROM stat_datasets WHERE id = $1', [id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating dataset:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

async function deleteDataset(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM stat_datasets WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting dataset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function uploadCSV(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const content = req.file.buffer.toString('utf-8');
    const records = csv.parse(content, { columns: true, skip_empty_lines: true });

    if (records.length === 0) {
      return res.status(400).json({ success: false, message: 'Empty CSV file' });
    }

    const columns = Object.keys(records[0]);

    res.json({
      success: true,
      data: {
        columns,
        rows: records,
        rowCount: records.length
      }
    });
  } catch (error) {
    console.error('Error parsing CSV:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ============ HISTOGRAM / DISTRIBUTION ============

async function analyzeHistogram(req, res) {
  try {
    const { datasetId, column, bins = 10 } = req.body;

    const rowsResult = await pool.query(
      'SELECT row_data FROM stat_dataset_rows WHERE dataset_id = $1 ORDER BY row_index',
      [datasetId]
    );

    const values = rowsResult.rows
      .map(r => parseFloat(r.row_data[column]))
      .filter(v => !isNaN(v));

    if (values.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid numeric data' });
    }

    const histogram = stats.histogram(values, bins);
    const ad = stats.andersonDarling(values);

    res.json({
      success: true,
      data: {
        histogram,
        statistics: {
          n: values.length,
          mean: stats.mean(values),
          stdDev: stats.stdDev(values),
          min: stats.min(values),
          max: stats.max(values),
          median: stats.median(values),
          skewness: stats.skewness(values),
          kurtosis: stats.kurtosis(values)
        },
        normality: {
          andersonDarling: ad.statistic,
          pValue: ad.pValue,
          isNormal: ad.pValue > 0.05
        }
      }
    });
  } catch (error) {
    console.error('Error analyzing histogram:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ============ PARETO ============

async function analyzePareto(req, res) {
  try {
    const { datasetId, categoryColumn } = req.body;

    const rowsResult = await pool.query(
      'SELECT row_data FROM stat_dataset_rows WHERE dataset_id = $1',
      [datasetId]
    );

    const data = rowsResult.rows.map(r => r.row_data);
    const result = stats.paretoAnalysis(data, categoryColumn);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error analyzing pareto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ============ PROCESS CAPABILITY ============

async function analyzeCapability(req, res) {
  try {
    const { datasetId, column, lsl, usl, target } = req.body;

    if (lsl === undefined || usl === undefined) {
      return res.status(400).json({ success: false, message: 'LSL and USL are required' });
    }

    const rowsResult = await pool.query(
      'SELECT row_data FROM stat_dataset_rows WHERE dataset_id = $1 ORDER BY row_index',
      [datasetId]
    );

    const values = rowsResult.rows
      .map(r => parseFloat(r.row_data[column]))
      .filter(v => !isNaN(v));

    if (values.length < 2) {
      return res.status(400).json({ success: false, message: 'Insufficient data' });
    }

    const capability = stats.processCapability(values, parseFloat(lsl), parseFloat(usl), target ? parseFloat(target) : null);
    const histogram = stats.histogram(values, 15);

    res.json({
      success: true,
      data: {
        capability,
        histogram,
        values
      }
    });
  } catch (error) {
    console.error('Error analyzing capability:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ============ CONTROL CHARTS ============

async function analyzeControlCharts(req, res) {
  try {
    const { datasetId, column, chartType, subgroupSize = 5 } = req.body;

    const rowsResult = await pool.query(
      'SELECT row_data FROM stat_dataset_rows WHERE dataset_id = $1 ORDER BY row_index',
      [datasetId]
    );

    const values = rowsResult.rows
      .map(r => parseFloat(r.row_data[column]))
      .filter(v => !isNaN(v));

    if (values.length < 10) {
      return res.status(400).json({ success: false, message: 'Need at least 10 data points' });
    }

    let result;
    if (chartType === 'xbar-r') {
      result = stats.xbarRChart(values, parseInt(subgroupSize));
    } else {
      result = stats.imrChart(values);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error analyzing control charts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ============ REGRESSION ============

async function analyzeRegression(req, res) {
  try {
    const { datasetId, xColumn, yColumn } = req.body;

    const rowsResult = await pool.query(
      'SELECT row_data FROM stat_dataset_rows WHERE dataset_id = $1 ORDER BY row_index',
      [datasetId]
    );

    const pairs = rowsResult.rows
      .map(r => ({
        x: parseFloat(r.row_data[xColumn]),
        y: parseFloat(r.row_data[yColumn])
      }))
      .filter(p => !isNaN(p.x) && !isNaN(p.y));

    if (pairs.length < 3) {
      return res.status(400).json({ success: false, message: 'Need at least 3 data points' });
    }

    const x = pairs.map(p => p.x);
    const y = pairs.map(p => p.y);

    const regression = stats.linearRegression(x, y);
    const correlation = stats.correlation(x, y);

    res.json({
      success: true,
      data: {
        points: pairs,
        regression: {
          slope: regression.slope,
          intercept: regression.intercept,
          equation: regression.equation,
          r: regression.r,
          r2: regression.r2
        },
        correlation
      }
    });
  } catch (error) {
    console.error('Error analyzing regression:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ============ GAGE R&R ============

async function analyzeGageRR(req, res) {
  try {
    const { datasetId, partColumn, operatorColumn, measurementColumn } = req.body;

    const rowsResult = await pool.query(
      'SELECT row_data FROM stat_dataset_rows WHERE dataset_id = $1',
      [datasetId]
    );

    const data = rowsResult.rows.map(r => r.row_data);

    if (data.length < 10) {
      return res.status(400).json({ success: false, message: 'Insufficient data for Gage R&R' });
    }

    const result = stats.gageRR(data, partColumn, operatorColumn, measurementColumn);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error analyzing Gage R&R:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ============ TAGUCHI DOE ============

async function getTaguchiArray(req, res) {
  try {
    const { arrayType } = req.params;
    const array = stats.generateTaguchiArray(arrayType);

    if (!array) {
      return res.status(400).json({ success: false, message: 'Invalid array type' });
    }

    res.json({ success: true, data: array });
  } catch (error) {
    console.error('Error getting Taguchi array:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function analyzeTaguchi(req, res) {
  try {
    const { arrayType, results, snType = 'nominal', factorNames } = req.body;

    const arrayData = stats.generateTaguchiArray(arrayType);
    if (!arrayData) {
      return res.status(400).json({ success: false, message: 'Invalid array type' });
    }

    if (!results || results.length !== arrayData.runs) {
      return res.status(400).json({
        success: false,
        message: `Need ${arrayData.runs} results for ${arrayType} array`
      });
    }

    const analysis = stats.analyzeTaguchi(arrayData.array, results, snType);

    res.json({
      success: true,
      data: {
        array: arrayData,
        factorNames,
        ...analysis
      }
    });
  } catch (error) {
    console.error('Error analyzing Taguchi:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// ============ ANALYSIS HISTORY ============

async function saveAnalysis(req, res) {
  try {
    const { name, analysisType, datasetId, parameters, results } = req.body;
    const userId = req.user?.id;

    const result = await pool.query(
      `INSERT INTO stat_analysis_history (name, analysis_type, dataset_id, parameters, results, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, analysisType, datasetId, parameters, results, userId]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error saving analysis:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getAnalysisHistory(req, res) {
  try {
    const { type } = req.query;

    let query = `SELECT ah.*, sd.name as dataset_name
                 FROM stat_analysis_history ah
                 LEFT JOIN stat_datasets sd ON ah.dataset_id = sd.id`;

    const params = [];
    if (type) {
      query += ' WHERE ah.analysis_type = $1';
      params.push(type);
    }

    query += ' ORDER BY ah.created_at DESC LIMIT 100';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching analysis history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getAnalysis(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT ah.*, sd.name as dataset_name
       FROM stat_analysis_history ah
       LEFT JOIN stat_datasets sd ON ah.dataset_id = sd.id
       WHERE ah.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Analysis not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteAnalysis(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM stat_analysis_history WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  // Datasets
  getDatasets,
  getDataset,
  createDataset,
  updateDataset,
  deleteDataset,
  uploadCSV,

  // Analysis
  analyzeHistogram,
  analyzePareto,
  analyzeCapability,
  analyzeControlCharts,
  analyzeRegression,
  analyzeGageRR,
  getTaguchiArray,
  analyzeTaguchi,

  // History
  saveAnalysis,
  getAnalysisHistory,
  getAnalysis,
  deleteAnalysis
};
