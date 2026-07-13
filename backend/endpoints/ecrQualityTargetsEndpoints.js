const { pool } = require('../config/database');

async function getQualityTargets(req, res) {
  try {
    const result = await pool.query('SELECT * FROM ecr_quality_targets ORDER BY id LIMIT 1');
    res.json({ success: true, targets: result.rows[0] });
  } catch (err) {
    console.error('Error fetching quality targets:', err);
    res.status(500).json({ success: false, message: 'Error fetching quality targets' });
  }
}

async function updateQualityTargets(req, res) {
  const { cpTarget, cpkTarget, processStabilityTarget, initialScrapTarget } = req.body;
  try {
    const result = await pool.query(
      `UPDATE ecr_quality_targets SET
        cp_target = $1, cpk_target = $2,
        process_stability_target = $3, initial_scrap_target = $4,
        updated_at = NOW()
       WHERE id = (SELECT id FROM ecr_quality_targets ORDER BY id LIMIT 1)
       RETURNING *`,
      [cpTarget, cpkTarget, processStabilityTarget, initialScrapTarget]
    );
    res.json({ success: true, targets: result.rows[0] });
  } catch (err) {
    console.error('Error updating quality targets:', err);
    res.status(500).json({ success: false, message: 'Error updating quality targets' });
  }
}

module.exports = { getQualityTargets, updateQualityTargets };
