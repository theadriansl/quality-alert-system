/**
 * Inspection Catalog Endpoints (GLOBAL)
 * CRUD operations for company-wide inspection catalogs:
 * - Severities (with QAR threshold rules)
 * - Stations
 * - Stages
 * - Shifts
 * - Dispositions
 *
 * These are GLOBAL catalogs, not per-client.
 * Per-client configuration is done in DefectAdminV2 (defects per part).
 */

const express = require('express');
const router = express.Router();
const { transformToCamelCase } = require('../utils/caseTransform');

module.exports = (pool) => {

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getCatalogTable = (catalogType) => {
    const tables = {
      severities: 'inspection_severities',
      stations: 'inspection_stations',
      stages: 'inspection_stages',
      shifts: 'inspection_shifts',
      dispositions: 'inspection_dispositions',
      departments: 'departments'
    };
    return tables[catalogType] || null;
  };

  const getSelectFields = (catalogType) => {
    // Departments table doesn't have 'code' or 'updated_at' columns
    if (catalogType === 'departments') {
      return 'id, name, description, display_order, is_active, created_at';
    }
    const base = 'id, code, name, display_order, is_active, created_at, updated_at';
    const extra = {
      severities: ', color, qar_threshold_count, qar_threshold_hours',
      stations: ', description',
      stages: ', description, department_id',
      shifts: ', start_time, end_time',
      dispositions: ', description, color, requires_downtime'
    };
    return base + (extra[catalogType] || '');
  };

  // ============================================================================
  // GET ALL ITEMS BY TYPE (GLOBAL)
  // GET /inspection-catalogs/:catalogType
  // ============================================================================
  router.get('/:catalogType', async (req, res) => {
    try {
      const { catalogType } = req.params;
      const { includeInactive } = req.query;

      const table = getCatalogTable(catalogType);
      if (!table) {
        return res.status(400).json({ success: false, message: 'Invalid catalog type' });
      }

      const fields = getSelectFields(catalogType);
      let query = `SELECT ${fields} FROM ${table}`;

      if (includeInactive !== 'true') {
        query += ' WHERE is_active = true';
      }

      query += ' ORDER BY display_order, name';

      const result = await pool.query(query);

      res.json({
        success: true,
        items: transformToCamelCase(result.rows),
        count: result.rows.length
      });
    } catch (error) {
      console.error(`Error fetching ${req.params.catalogType}:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============================================================================
  // GET SINGLE ITEM
  // GET /inspection-catalogs/:catalogType/:id
  // ============================================================================
  router.get('/:catalogType/:id', async (req, res) => {
    try {
      const { catalogType, id } = req.params;

      // Skip if id is not a number (could be another route)
      if (isNaN(parseInt(id))) {
        return res.status(400).json({ success: false, message: 'Invalid ID' });
      }

      const table = getCatalogTable(catalogType);
      if (!table) {
        return res.status(400).json({ success: false, message: 'Invalid catalog type' });
      }

      const fields = getSelectFields(catalogType);
      const result = await pool.query(
        `SELECT ${fields} FROM ${table} WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }

      res.json({
        success: true,
        item: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error(`Error fetching item:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============================================================================
  // CREATE ITEM (GLOBAL)
  // POST /inspection-catalogs/:catalogType
  // ============================================================================
  router.post('/:catalogType', async (req, res) => {
    try {
      const { catalogType } = req.params;
      const table = getCatalogTable(catalogType);

      if (!table) {
        return res.status(400).json({ success: false, message: 'Invalid catalog type' });
      }

      let query, values;

      switch (catalogType) {
        case 'severities':
          const { code, name, color, qarThresholdCount, qarThresholdHours, displayOrder } = req.body;
          query = `
            INSERT INTO ${table} (code, name, color, qar_threshold_count, qar_threshold_hours, display_order)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          values = [code, name, color || '#6b7280', qarThresholdCount || 1, qarThresholdHours || 0, displayOrder || 0];
          break;

        case 'stations':
          query = `
            INSERT INTO ${table} (code, name, description, display_order, station_type)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `;
          values = [req.body.code, req.body.name, req.body.description || null, req.body.displayOrder || 0, req.body.stationType || 'INSPECTION'];
          break;

        case 'stages':
          query = `
            INSERT INTO ${table} (code, name, description, display_order, department_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `;
          values = [req.body.code, req.body.name, req.body.description || null, req.body.displayOrder || 0, req.body.departmentId || null];
          break;

        case 'shifts':
          query = `
            INSERT INTO ${table} (code, name, start_time, end_time, display_order)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `;
          values = [req.body.code, req.body.name, req.body.startTime || null, req.body.endTime || null, req.body.displayOrder || 0];
          break;

        case 'dispositions':
          query = `
            INSERT INTO ${table} (code, name, description, color, requires_downtime, display_order)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `;
          values = [req.body.code, req.body.name, req.body.description || null, req.body.color || '#6b7280', req.body.requiresDowntime || false, req.body.displayOrder || 0];
          break;

        default:
          return res.status(400).json({ success: false, message: 'Invalid catalog type' });
      }

      const result = await pool.query(query, values);

      res.status(201).json({
        success: true,
        item: transformToCamelCase(result.rows[0]),
        message: 'Item created successfully'
      });
    } catch (error) {
      console.error(`Error creating item:`, error);
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ success: false, message: 'Ya existe un item con este código' });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============================================================================
  // UPDATE ITEM
  // PUT /inspection-catalogs/:catalogType/:id
  // ============================================================================
  router.put('/:catalogType/:id', async (req, res) => {
    try {
      const { catalogType, id } = req.params;
      const table = getCatalogTable(catalogType);

      if (!table) {
        return res.status(400).json({ success: false, message: 'Invalid catalog type' });
      }

      let query, values;

      switch (catalogType) {
        case 'severities':
          query = `
            UPDATE ${table} SET
              code = $1, name = $2, color = $3,
              qar_threshold_count = $4, qar_threshold_hours = $5,
              display_order = $6, is_active = $7
            WHERE id = $8
            RETURNING *
          `;
          values = [
            req.body.code, req.body.name, req.body.color,
            req.body.qarThresholdCount, req.body.qarThresholdHours,
            req.body.displayOrder, req.body.isActive ?? true, id
          ];
          break;

        case 'stations':
          query = `
            UPDATE ${table} SET
              code = $1, name = $2, description = $3,
              display_order = $4, is_active = $5, station_type = $6
            WHERE id = $7
            RETURNING *
          `;
          values = [req.body.code, req.body.name, req.body.description, req.body.displayOrder, req.body.isActive ?? true, req.body.stationType || 'INSPECTION', id];
          break;

        case 'stages':
          query = `
            UPDATE ${table} SET
              code = $1, name = $2, description = $3,
              display_order = $4, is_active = $5, department_id = $6
            WHERE id = $7
            RETURNING *
          `;
          values = [req.body.code, req.body.name, req.body.description, req.body.displayOrder, req.body.isActive ?? true, req.body.departmentId || null, id];
          break;

        case 'shifts':
          query = `
            UPDATE ${table} SET
              code = $1, name = $2, start_time = $3, end_time = $4,
              display_order = $5, is_active = $6
            WHERE id = $7
            RETURNING *
          `;
          values = [req.body.code, req.body.name, req.body.startTime, req.body.endTime, req.body.displayOrder, req.body.isActive ?? true, id];
          break;

        case 'dispositions':
          query = `
            UPDATE ${table} SET
              code = $1, name = $2, description = $3, color = $4,
              requires_downtime = $5, display_order = $6, is_active = $7
            WHERE id = $8
            RETURNING *
          `;
          values = [req.body.code, req.body.name, req.body.description, req.body.color, req.body.requiresDowntime, req.body.displayOrder, req.body.isActive ?? true, id];
          break;

        default:
          return res.status(400).json({ success: false, message: 'Invalid catalog type' });
      }

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }

      res.json({
        success: true,
        item: transformToCamelCase(result.rows[0]),
        message: 'Item updated successfully'
      });
    } catch (error) {
      console.error(`Error updating item:`, error);
      if (error.code === '23505') {
        return res.status(400).json({ success: false, message: 'Ya existe un item con este código' });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============================================================================
  // DELETE ITEM (soft delete - set is_active = false)
  // DELETE /inspection-catalogs/:catalogType/:id
  // ============================================================================
  router.delete('/:catalogType/:id', async (req, res) => {
    try {
      const { catalogType, id } = req.params;
      const { hard } = req.query;

      const table = getCatalogTable(catalogType);
      if (!table) {
        return res.status(400).json({ success: false, message: 'Invalid catalog type' });
      }

      let query;
      if (hard === 'true') {
        query = `DELETE FROM ${table} WHERE id = $1 RETURNING id`;
      } else {
        query = `UPDATE ${table} SET is_active = false WHERE id = $1 RETURNING id`;
      }

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }

      res.json({
        success: true,
        message: hard === 'true' ? 'Item eliminado permanentemente' : 'Item desactivado'
      });
    } catch (error) {
      console.error(`Error deleting item:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============================================================================
  // REORDER ITEMS
  // PUT /inspection-catalogs/:catalogType/reorder
  // ============================================================================
  router.put('/:catalogType/reorder', async (req, res) => {
    try {
      const { catalogType } = req.params;
      const { items } = req.body; // Array of { id, displayOrder }

      const table = getCatalogTable(catalogType);
      if (!table) {
        return res.status(400).json({ success: false, message: 'Invalid catalog type' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        for (const item of items) {
          await client.query(
            `UPDATE ${table} SET display_order = $1 WHERE id = $2`,
            [item.displayOrder, item.id]
          );
        }

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Items reordered successfully'
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`Error reordering items:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  console.log('✅ Inspection Catalog endpoints registered (GLOBAL)');
  return router;
};
