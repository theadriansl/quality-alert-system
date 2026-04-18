/**
 * BOM Field Configuration Endpoints
 * ADMIN ONLY - Manage custom fields for BOM Global
 *
 * Fixed fields (NOT managed here):
 * - is_active, client_id, part_number, name, description, revision, bom_level, unit_cost
 *
 * These endpoints manage the configurable custom fields stored in custom_fields JSONB
 */

const { pool } = require('../config/database');
const { transformToCamelCase } = require('../utils/caseTransform');

function setupBomFieldConfigEndpoints(app, authenticateToken) {

  // ============================================================================
  // GET /api/bom-field-config - Get all field configurations
  // ============================================================================
  app.get('/api/bom-field-config', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          field_name,
          field_key,
          field_type,
          is_required,
          min_value,
          max_value,
          max_length,
          options,
          default_value,
          display_order,
          description,
          show_in_table,
          show_in_form,
          show_in_template,
          is_active,
          created_at,
          updated_at
        FROM bom_field_config
        WHERE is_active = true
        ORDER BY display_order ASC, field_name ASC
      `);

      res.json(transformToCamelCase(result.rows));
    } catch (error) {
      console.error('Error fetching BOM field config:', error);
      res.status(500).json({ error: 'Error al obtener configuracion de campos' });
    }
  });

  // ============================================================================
  // GET /api/bom-field-config/all - Get ALL field configurations (including inactive)
  // ADMIN ONLY
  // ============================================================================
  app.get('/api/bom-field-config/all', authenticateToken, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo administradores pueden ver campos inactivos' });
      }

      const result = await pool.query(`
        SELECT
          id,
          field_name,
          field_key,
          field_type,
          is_required,
          min_value,
          max_value,
          max_length,
          options,
          default_value,
          display_order,
          description,
          show_in_table,
          show_in_form,
          show_in_template,
          is_active,
          created_at,
          updated_at,
          created_by,
          updated_by
        FROM bom_field_config
        ORDER BY display_order ASC, field_name ASC
      `);

      res.json(transformToCamelCase(result.rows));
    } catch (error) {
      console.error('Error fetching all BOM field config:', error);
      res.status(500).json({ error: 'Error al obtener configuracion de campos' });
    }
  });

  // ============================================================================
  // POST /api/bom-field-config - Create new field configuration
  // ADMIN ONLY
  // ============================================================================
  app.post('/api/bom-field-config', authenticateToken, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo administradores pueden crear campos' });
      }

      const {
        fieldName,
        fieldKey,
        fieldType = 'text',
        isRequired = false,
        minValue,
        maxValue,
        maxLength,
        options,
        defaultValue,
        displayOrder = 0,
        description,
        showInTable = true,
        showInForm = true,
        showInTemplate = true
      } = req.body;

      // Validate required fields
      if (!fieldName || !fieldKey) {
        return res.status(400).json({ error: 'fieldName y fieldKey son requeridos' });
      }

      // Validate field type
      const validTypes = ['text', 'number', 'date', 'select', 'boolean'];
      if (!validTypes.includes(fieldType)) {
        return res.status(400).json({ error: `Tipo de campo invalido. Usar: ${validTypes.join(', ')}` });
      }

      // Check for duplicate field_key
      const existingCheck = await pool.query(
        'SELECT id FROM bom_field_config WHERE field_key = $1',
        [fieldKey]
      );
      if (existingCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Ya existe un campo con esa clave' });
      }

      const result = await pool.query(`
        INSERT INTO bom_field_config (
          field_name, field_key, field_type, is_required,
          min_value, max_value, max_length, options, default_value,
          display_order, description, show_in_table, show_in_form,
          show_in_template, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
        fieldName, fieldKey, fieldType, isRequired,
        minValue, maxValue, maxLength, options ? JSON.stringify(options) : null, defaultValue,
        displayOrder, description, showInTable, showInForm,
        showInTemplate, req.user.id
      ]);

      res.status(201).json(transformToCamelCase(result.rows[0]));
    } catch (error) {
      console.error('Error creating BOM field config:', error);
      if (error.code === '23505') {
        res.status(400).json({ error: 'Ya existe un campo con ese nombre o clave' });
      } else {
        res.status(500).json({ error: 'Error al crear campo' });
      }
    }
  });

  // ============================================================================
  // PUT /api/bom-field-config/:id - Update field configuration
  // ADMIN ONLY
  // ============================================================================
  app.put('/api/bom-field-config/:id', authenticateToken, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo administradores pueden editar campos' });
      }

      const { id } = req.params;
      const {
        fieldName,
        fieldKey,
        fieldType,
        isRequired,
        minValue,
        maxValue,
        maxLength,
        options,
        defaultValue,
        displayOrder,
        description,
        showInTable,
        showInForm,
        showInTemplate,
        isActive
      } = req.body;

      // Check if field exists
      const existingField = await pool.query(
        'SELECT id FROM bom_field_config WHERE id = $1',
        [id]
      );
      if (existingField.rows.length === 0) {
        return res.status(404).json({ error: 'Campo no encontrado' });
      }

      // Validate field type if provided
      if (fieldType) {
        const validTypes = ['text', 'number', 'date', 'select', 'boolean'];
        if (!validTypes.includes(fieldType)) {
          return res.status(400).json({ error: `Tipo de campo invalido. Usar: ${validTypes.join(', ')}` });
        }
      }

      // Build dynamic update query
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (fieldName !== undefined) { updates.push(`field_name = $${paramCount++}`); values.push(fieldName); }
      if (fieldKey !== undefined) { updates.push(`field_key = $${paramCount++}`); values.push(fieldKey); }
      if (fieldType !== undefined) { updates.push(`field_type = $${paramCount++}`); values.push(fieldType); }
      if (isRequired !== undefined) { updates.push(`is_required = $${paramCount++}`); values.push(isRequired); }
      if (minValue !== undefined) { updates.push(`min_value = $${paramCount++}`); values.push(minValue); }
      if (maxValue !== undefined) { updates.push(`max_value = $${paramCount++}`); values.push(maxValue); }
      if (maxLength !== undefined) { updates.push(`max_length = $${paramCount++}`); values.push(maxLength); }
      if (options !== undefined) { updates.push(`options = $${paramCount++}`); values.push(options ? JSON.stringify(options) : null); }
      if (defaultValue !== undefined) { updates.push(`default_value = $${paramCount++}`); values.push(defaultValue); }
      if (displayOrder !== undefined) { updates.push(`display_order = $${paramCount++}`); values.push(displayOrder); }
      if (description !== undefined) { updates.push(`description = $${paramCount++}`); values.push(description); }
      if (showInTable !== undefined) { updates.push(`show_in_table = $${paramCount++}`); values.push(showInTable); }
      if (showInForm !== undefined) { updates.push(`show_in_form = $${paramCount++}`); values.push(showInForm); }
      if (showInTemplate !== undefined) { updates.push(`show_in_template = $${paramCount++}`); values.push(showInTemplate); }
      if (isActive !== undefined) { updates.push(`is_active = $${paramCount++}`); values.push(isActive); }

      // Add updated_by
      updates.push(`updated_by = $${paramCount++}`);
      values.push(req.user.id);

      // Add id as last parameter
      values.push(id);

      const result = await pool.query(`
        UPDATE bom_field_config
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

      res.json(transformToCamelCase(result.rows[0]));
    } catch (error) {
      console.error('Error updating BOM field config:', error);
      if (error.code === '23505') {
        res.status(400).json({ error: 'Ya existe un campo con ese nombre o clave' });
      } else {
        res.status(500).json({ error: 'Error al actualizar campo' });
      }
    }
  });

  // ============================================================================
  // DELETE /api/bom-field-config/:id - Delete (deactivate) field configuration
  // ADMIN ONLY
  // ============================================================================
  app.delete('/api/bom-field-config/:id', authenticateToken, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo administradores pueden eliminar campos' });
      }

      const { id } = req.params;

      // Soft delete - just deactivate
      const result = await pool.query(`
        UPDATE bom_field_config
        SET is_active = false, updated_by = $1
        WHERE id = $2
        RETURNING id
      `, [req.user.id, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Campo no encontrado' });
      }

      res.json({ message: 'Campo eliminado correctamente' });
    } catch (error) {
      console.error('Error deleting BOM field config:', error);
      res.status(500).json({ error: 'Error al eliminar campo' });
    }
  });

  // ============================================================================
  // PUT /api/bom-field-config/reorder - Reorder fields
  // ADMIN ONLY
  // ============================================================================
  app.put('/api/bom-field-config/reorder', authenticateToken, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo administradores pueden reordenar campos' });
      }

      const { fieldOrders } = req.body; // Array of { id, displayOrder }

      if (!Array.isArray(fieldOrders)) {
        return res.status(400).json({ error: 'fieldOrders debe ser un array' });
      }

      // Update each field's display order
      for (const { id, displayOrder } of fieldOrders) {
        await pool.query(
          'UPDATE bom_field_config SET display_order = $1, updated_by = $2 WHERE id = $3',
          [displayOrder, req.user.id, id]
        );
      }

      res.json({ message: 'Orden actualizado correctamente' });
    } catch (error) {
      console.error('Error reordering BOM field config:', error);
      res.status(500).json({ error: 'Error al reordenar campos' });
    }
  });

  console.log('BOM Field Config endpoints registered');
}

module.exports = { setupBomFieldConfigEndpoints };
