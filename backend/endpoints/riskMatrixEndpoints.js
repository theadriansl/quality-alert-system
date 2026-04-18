const { pool } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');

// GET active risk matrix configuration
const getActiveRiskMatrix = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        config_name,
        severity_levels,
        occurrence_levels,
        risk_rules,
        validation_suggestions,
        change_categories,
        change_types,
        risk_levels,
        legal_disclaimer,
        is_active,
        created_at,
        updated_at
      FROM risk_matrix_config
      WHERE is_active = TRUE
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active risk matrix configuration found'
      });
    }

    const config = transformToCamelCase(result.rows[0]);
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error fetching risk matrix:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Calculate risk level based on category + type
const calculateRisk = async (req, res) => {
  try {
    const { category, type } = req.body;

    if (!category || !type) {
      return res.status(400).json({
        success: false,
        message: 'Category and type are required'
      });
    }

    // Get active matrix
    const matrixResult = await pool.query(`
      SELECT risk_matrix_rules, risk_levels, legal_disclaimer
      FROM risk_matrix_config
      WHERE is_active = TRUE
      LIMIT 1
    `);

    if (matrixResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active risk matrix found'
      });
    }

    const { risk_matrix_rules, risk_levels, legal_disclaimer } = matrixResult.rows[0];

    // Find matching rule
    const matchingRule = risk_matrix_rules.find(
      rule => rule.category === category && rule.type === type
    );

    if (!matchingRule) {
      // Default to medium if no rule found
      return res.json({
        success: true,
        riskLevel: 'medium',
        suggestedAreas: [],
        reasoning: 'No specific rule found - defaulting to medium risk',
        riskLevelInfo: risk_levels.medium,
        legalDisclaimer: legal_disclaimer
      });
    }

    const riskLevelInfo = risk_levels[matchingRule.riskLevel];

    res.json({
      success: true,
      riskLevel: matchingRule.riskLevel,
      suggestedAreas: matchingRule.suggestedAreas,
      reasoning: matchingRule.reasoning,
      riskLevelInfo,
      legalDisclaimer: legal_disclaimer
    });
  } catch (error) {
    console.error('Error calculating risk:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE risk matrix configuration (admin only)
const updateRiskMatrix = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      severityLevels,
      occurrenceLevels,
      riskRules,
      validationSuggestions
    } = req.body;

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT system_role FROM users WHERE id = $1',
      [userId]
    );

    if (!userResult.rows[0] || userResult.rows[0].system_role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can modify risk matrix configuration'
      });
    }

    const result = await pool.query(`
      UPDATE risk_matrix_config
      SET
        severity_levels = $1,
        occurrence_levels = $2,
        risk_rules = $3,
        validation_suggestions = $4,
        updated_at = NOW(),
        updated_by = $5
      WHERE is_active = TRUE
      RETURNING *
    `, [
      JSON.stringify(severityLevels),
      JSON.stringify(occurrenceLevels),
      JSON.stringify(riskRules),
      JSON.stringify(validationSuggestions),
      userId
    ]);

    const updated = transformToCamelCase(result.rows[0]);
    res.json({ success: true, config: updated });
  } catch (error) {
    console.error('Error updating risk matrix:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getActiveRiskMatrix,
  calculateRisk,
  updateRiskMatrix
};
