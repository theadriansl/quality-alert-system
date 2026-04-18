const { pool } = require('../config/database');

const datasets = [
  {
    name: 'Measurement Data - Diameter',
    description: 'Sample diameter measurements for capability analysis (LSL: 9.95, USL: 10.05, Target: 10.00)',
    columns: ['Sample', 'Diameter'],
    rows: [
      { Sample: 1, Diameter: 10.02 }, { Sample: 2, Diameter: 9.98 }, { Sample: 3, Diameter: 10.01 },
      { Sample: 4, Diameter: 9.99 }, { Sample: 5, Diameter: 10.03 }, { Sample: 6, Diameter: 9.97 },
      { Sample: 7, Diameter: 10.00 }, { Sample: 8, Diameter: 10.02 }, { Sample: 9, Diameter: 9.98 },
      { Sample: 10, Diameter: 10.01 }, { Sample: 11, Diameter: 9.99 }, { Sample: 12, Diameter: 10.00 },
      { Sample: 13, Diameter: 10.02 }, { Sample: 14, Diameter: 9.97 }, { Sample: 15, Diameter: 10.01 },
      { Sample: 16, Diameter: 9.98 }, { Sample: 17, Diameter: 10.03 }, { Sample: 18, Diameter: 9.99 },
      { Sample: 19, Diameter: 10.00 }, { Sample: 20, Diameter: 10.01 }, { Sample: 21, Diameter: 9.98 },
      { Sample: 22, Diameter: 10.02 }, { Sample: 23, Diameter: 9.99 }, { Sample: 24, Diameter: 10.00 },
      { Sample: 25, Diameter: 10.01 }, { Sample: 26, Diameter: 9.97 }, { Sample: 27, Diameter: 10.02 },
      { Sample: 28, Diameter: 9.98 }, { Sample: 29, Diameter: 10.00 }, { Sample: 30, Diameter: 10.01 },
      { Sample: 31, Diameter: 9.99 }, { Sample: 32, Diameter: 10.02 }, { Sample: 33, Diameter: 9.98 },
      { Sample: 34, Diameter: 10.01 }, { Sample: 35, Diameter: 10.00 }, { Sample: 36, Diameter: 9.99 },
      { Sample: 37, Diameter: 10.03 }, { Sample: 38, Diameter: 9.97 }, { Sample: 39, Diameter: 10.01 },
      { Sample: 40, Diameter: 9.98 }, { Sample: 41, Diameter: 10.00 }, { Sample: 42, Diameter: 10.02 },
      { Sample: 43, Diameter: 9.99 }, { Sample: 44, Diameter: 10.01 }, { Sample: 45, Diameter: 9.98 },
      { Sample: 46, Diameter: 10.00 }, { Sample: 47, Diameter: 10.02 }, { Sample: 48, Diameter: 9.99 },
      { Sample: 49, Diameter: 10.01 }, { Sample: 50, Diameter: 9.98 }
    ]
  },
  {
    name: 'Defect Categories - Production Line',
    description: 'Defect types for Pareto analysis',
    columns: ['DefectID', 'DefectType', 'Line'],
    rows: [
      { DefectID: 1, DefectType: 'Scratch', Line: 'A' },
      { DefectID: 2, DefectType: 'Scratch', Line: 'A' },
      { DefectID: 3, DefectType: 'Scratch', Line: 'B' },
      { DefectID: 4, DefectType: 'Scratch', Line: 'A' },
      { DefectID: 5, DefectType: 'Scratch', Line: 'A' },
      { DefectID: 6, DefectType: 'Scratch', Line: 'B' },
      { DefectID: 7, DefectType: 'Scratch', Line: 'A' },
      { DefectID: 8, DefectType: 'Scratch', Line: 'A' },
      { DefectID: 9, DefectType: 'Dent', Line: 'A' },
      { DefectID: 10, DefectType: 'Dent', Line: 'B' },
      { DefectID: 11, DefectType: 'Dent', Line: 'A' },
      { DefectID: 12, DefectType: 'Dent', Line: 'A' },
      { DefectID: 13, DefectType: 'Dent', Line: 'B' },
      { DefectID: 14, DefectType: 'Contamination', Line: 'A' },
      { DefectID: 15, DefectType: 'Contamination', Line: 'A' },
      { DefectID: 16, DefectType: 'Contamination', Line: 'B' },
      { DefectID: 17, DefectType: 'Contamination', Line: 'A' },
      { DefectID: 18, DefectType: 'Dimension', Line: 'A' },
      { DefectID: 19, DefectType: 'Dimension', Line: 'B' },
      { DefectID: 20, DefectType: 'Dimension', Line: 'A' },
      { DefectID: 21, DefectType: 'Color', Line: 'A' },
      { DefectID: 22, DefectType: 'Color', Line: 'B' },
      { DefectID: 23, DefectType: 'Missing Part', Line: 'A' },
      { DefectID: 24, DefectType: 'Other', Line: 'B' }
    ]
  },
  {
    name: 'Temperature vs Yield',
    description: 'Process temperature and yield data for regression analysis',
    columns: ['Temperature', 'Yield'],
    rows: [
      { Temperature: 150, Yield: 72 }, { Temperature: 155, Yield: 75 },
      { Temperature: 160, Yield: 78 }, { Temperature: 165, Yield: 82 },
      { Temperature: 170, Yield: 85 }, { Temperature: 175, Yield: 87 },
      { Temperature: 180, Yield: 89 }, { Temperature: 185, Yield: 91 },
      { Temperature: 190, Yield: 92 }, { Temperature: 195, Yield: 93 },
      { Temperature: 200, Yield: 94 }, { Temperature: 205, Yield: 94 },
      { Temperature: 210, Yield: 93 }, { Temperature: 215, Yield: 91 },
      { Temperature: 220, Yield: 88 }
    ]
  },
  {
    name: 'Gage R&R Study - Caliper',
    description: 'Gage R&R data: 10 parts, 3 operators, 2 replications',
    columns: ['Part', 'Operator', 'Measurement'],
    rows: [
      // Operator A - Trial 1
      { Part: 'P1', Operator: 'Op_A', Measurement: 5.12 },
      { Part: 'P2', Operator: 'Op_A', Measurement: 5.08 },
      { Part: 'P3', Operator: 'Op_A', Measurement: 5.15 },
      { Part: 'P4', Operator: 'Op_A', Measurement: 5.03 },
      { Part: 'P5', Operator: 'Op_A', Measurement: 5.21 },
      { Part: 'P6', Operator: 'Op_A', Measurement: 4.98 },
      { Part: 'P7', Operator: 'Op_A', Measurement: 5.11 },
      { Part: 'P8', Operator: 'Op_A', Measurement: 5.06 },
      { Part: 'P9', Operator: 'Op_A', Measurement: 5.18 },
      { Part: 'P10', Operator: 'Op_A', Measurement: 5.01 },
      // Operator A - Trial 2
      { Part: 'P1', Operator: 'Op_A', Measurement: 5.13 },
      { Part: 'P2', Operator: 'Op_A', Measurement: 5.09 },
      { Part: 'P3', Operator: 'Op_A', Measurement: 5.14 },
      { Part: 'P4', Operator: 'Op_A', Measurement: 5.04 },
      { Part: 'P5', Operator: 'Op_A', Measurement: 5.20 },
      { Part: 'P6', Operator: 'Op_A', Measurement: 4.99 },
      { Part: 'P7', Operator: 'Op_A', Measurement: 5.12 },
      { Part: 'P8', Operator: 'Op_A', Measurement: 5.05 },
      { Part: 'P9', Operator: 'Op_A', Measurement: 5.17 },
      { Part: 'P10', Operator: 'Op_A', Measurement: 5.02 },
      // Operator B - Trial 1
      { Part: 'P1', Operator: 'Op_B', Measurement: 5.14 },
      { Part: 'P2', Operator: 'Op_B', Measurement: 5.10 },
      { Part: 'P3', Operator: 'Op_B', Measurement: 5.16 },
      { Part: 'P4', Operator: 'Op_B', Measurement: 5.05 },
      { Part: 'P5', Operator: 'Op_B', Measurement: 5.22 },
      { Part: 'P6', Operator: 'Op_B', Measurement: 5.00 },
      { Part: 'P7', Operator: 'Op_B', Measurement: 5.13 },
      { Part: 'P8', Operator: 'Op_B', Measurement: 5.07 },
      { Part: 'P9', Operator: 'Op_B', Measurement: 5.19 },
      { Part: 'P10', Operator: 'Op_B', Measurement: 5.03 },
      // Operator B - Trial 2
      { Part: 'P1', Operator: 'Op_B', Measurement: 5.13 },
      { Part: 'P2', Operator: 'Op_B', Measurement: 5.11 },
      { Part: 'P3', Operator: 'Op_B', Measurement: 5.15 },
      { Part: 'P4', Operator: 'Op_B', Measurement: 5.06 },
      { Part: 'P5', Operator: 'Op_B', Measurement: 5.21 },
      { Part: 'P6', Operator: 'Op_B', Measurement: 5.01 },
      { Part: 'P7', Operator: 'Op_B', Measurement: 5.12 },
      { Part: 'P8', Operator: 'Op_B', Measurement: 5.08 },
      { Part: 'P9', Operator: 'Op_B', Measurement: 5.18 },
      { Part: 'P10', Operator: 'Op_B', Measurement: 5.04 },
      // Operator C - Trial 1
      { Part: 'P1', Operator: 'Op_C', Measurement: 5.11 },
      { Part: 'P2', Operator: 'Op_C', Measurement: 5.07 },
      { Part: 'P3', Operator: 'Op_C', Measurement: 5.14 },
      { Part: 'P4', Operator: 'Op_C', Measurement: 5.02 },
      { Part: 'P5', Operator: 'Op_C', Measurement: 5.19 },
      { Part: 'P6', Operator: 'Op_C', Measurement: 4.97 },
      { Part: 'P7', Operator: 'Op_C', Measurement: 5.10 },
      { Part: 'P8', Operator: 'Op_C', Measurement: 5.04 },
      { Part: 'P9', Operator: 'Op_C', Measurement: 5.16 },
      { Part: 'P10', Operator: 'Op_C', Measurement: 5.00 },
      // Operator C - Trial 2
      { Part: 'P1', Operator: 'Op_C', Measurement: 5.12 },
      { Part: 'P2', Operator: 'Op_C', Measurement: 5.08 },
      { Part: 'P3', Operator: 'Op_C', Measurement: 5.13 },
      { Part: 'P4', Operator: 'Op_C', Measurement: 5.03 },
      { Part: 'P5', Operator: 'Op_C', Measurement: 5.20 },
      { Part: 'P6', Operator: 'Op_C', Measurement: 4.98 },
      { Part: 'P7', Operator: 'Op_C', Measurement: 5.11 },
      { Part: 'P8', Operator: 'Op_C', Measurement: 5.05 },
      { Part: 'P9', Operator: 'Op_C', Measurement: 5.17 },
      { Part: 'P10', Operator: 'Op_C', Measurement: 5.01 }
    ]
  },
  {
    name: 'SPC Data - Weight',
    description: 'Product weight data for control charts (100 samples)',
    columns: ['Sample', 'Weight'],
    rows: Array.from({ length: 100 }, (_, i) => ({
      Sample: i + 1,
      Weight: parseFloat((250 + (Math.random() - 0.5) * 4).toFixed(2))
    }))
  }
];

async function seedDatasets() {
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding statistical datasets...\n');

    for (const ds of datasets) {
      await client.query('BEGIN');

      // Insert dataset
      const dsResult = await client.query(
        `INSERT INTO stat_datasets (name, description, columns, row_count, created_by)
         VALUES ($1, $2, $3, $4, 1) RETURNING id`,
        [ds.name, ds.description, JSON.stringify(ds.columns), ds.rows.length]
      );

      const datasetId = dsResult.rows[0].id;

      // Insert rows
      for (let i = 0; i < ds.rows.length; i++) {
        await client.query(
          'INSERT INTO stat_dataset_rows (dataset_id, row_index, row_data) VALUES ($1, $2, $3)',
          [datasetId, i, JSON.stringify(ds.rows[i])]
        );
      }

      await client.query('COMMIT');
      console.log(`✅ Created: ${ds.name} (${ds.rows.length} rows)`);
    }

    console.log('\n✅ All datasets seeded successfully!');
    console.log('\nDatasets created:');
    console.log('  1. Measurement Data - Diameter → Histogram, Capability (LSL:9.95, USL:10.05)');
    console.log('  2. Defect Categories → Pareto (DefectType column)');
    console.log('  3. Temperature vs Yield → Regression (X:Temperature, Y:Yield)');
    console.log('  4. Gage R&R Study → Gage R&R (Part, Operator, Measurement)');
    console.log('  5. SPC Data - Weight → Control Charts');

    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding datasets:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedDatasets();
