/**
 * Client Timeline Endpoints - PostgreSQL Implementation
 * Handles retrieval of client activity timeline
 */

const { query } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');

// ============================================================================
// ENDPOINTS
// ============================================================================

const setupClientTimelineEndpoints = (app) => {

  // ==========================================================================
  // GET /clients/:clientId/timeline - Get timeline events for a client
  // ==========================================================================
  app.get('/clients/:clientId/timeline', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);

      // Optional filters
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const category = req.query.category; // 'documents', 'contacts', 'projects', etc.

      let queryText = `
        SELECT
          id, client_id, event_type, event_category,
          description, details, user_name, created_at
        FROM client_timeline
        WHERE client_id = $1
      `;

      const queryParams = [clientId];
      let paramCount = 2;

      // Add category filter if provided
      if (category) {
        queryText += ` AND event_category = $${paramCount}`;
        queryParams.push(category);
        paramCount++;
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      queryParams.push(limit, offset);

      const result = await query(queryText, queryParams);

      // Get total count
      let countQuery = `SELECT COUNT(*) FROM client_timeline WHERE client_id = $1`;
      const countParams = [clientId];

      if (category) {
        countQuery += ' AND event_category = $2';
        countParams.push(category);
      }

      const countResult = await query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      res.json({
        success: true,
        timeline: transformToCamelCase(result.rows),
        total: total,
        limit: limit,
        offset: offset
      });

    } catch (error) {
      console.error('Error fetching client timeline:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching timeline',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // GET /clients/:clientId/timeline/recent - Get recent activity
  // ==========================================================================
  app.get('/clients/:clientId/timeline/recent', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const limit = parseInt(req.query.limit) || 10;

      const result = await query(`
        SELECT
          id, client_id, event_type, event_category,
          description, details, user_name, created_at
        FROM client_timeline
        WHERE client_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [clientId, limit]);

      res.json({
        success: true,
        timeline: transformToCamelCase(result.rows),
        total: result.rows.length
      });

    } catch (error) {
      console.error('Error fetching recent timeline:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching recent timeline',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // POST /clients/:clientId/timeline - Manually add timeline event (optional)
  // ==========================================================================
  app.post('/clients/:clientId/timeline', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);

      const { eventType, eventCategory, description, details, userName } = req.body;

      if (!eventType || !description) {
        return res.status(400).json({
          success: false,
          message: 'eventType and description are required'
        });
      }

      const result = await query(`
        INSERT INTO client_timeline (
          client_id, event_type, event_category, description, details, user_name
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        clientId,
        eventType,
        eventCategory || 'general',
        description,
        details ? JSON.stringify(details) : null,
        userName || 'System'
      ]);

      res.json({
        success: true,
        message: 'Timeline event added successfully',
        event: transformToCamelCase(result.rows[0])
      });

    } catch (error) {
      console.error('Error adding timeline event:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding timeline event',
        error: error.message
      });
    }
  });

};

module.exports = setupClientTimelineEndpoints;
