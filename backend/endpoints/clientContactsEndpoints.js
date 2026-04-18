/**
 * Client Contacts Endpoints - PostgreSQL Implementation
 * Handles CRUD operations for client contact persons
 */

const { query } = require('../config/database');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');

// ============================================================================
// TIMELINE HELPER
// ============================================================================

async function addTimelineEvent(clientId, eventType, description, userName) {
  try {
    await query(`
      INSERT INTO client_timeline (client_id, event_type, event_category, description, user_name)
      VALUES ($1, $2, $3, $4, $5)
    `, [clientId, eventType, 'contacts', description, userName || 'System']);
  } catch (error) {
    console.error('Error adding timeline event:', error);
  }
}

// ============================================================================
// ENDPOINTS
// ============================================================================

const setupClientContactsEndpoints = (app) => {

  // ==========================================================================
  // GET /clients/:clientId/contacts - List all contacts for a client
  // ==========================================================================
  app.get('/clients/:clientId/contacts', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);

      const result = await query(`
        SELECT id, client_id, name, title, email, phone, created_at, updated_at
        FROM client_contacts
        WHERE client_id = $1
        ORDER BY name ASC
      `, [clientId]);

      res.json({
        success: true,
        contacts: transformToCamelCase(result.rows),
        total: result.rows.length
      });

    } catch (error) {
      console.error('Error fetching client contacts:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching contacts',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // GET /clients/:clientId/contacts/:contactId - Get single contact
  // ==========================================================================
  app.get('/clients/:clientId/contacts/:contactId', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const contactId = parseInt(req.params.contactId);

      const result = await query(`
        SELECT id, client_id, name, title, email, phone, created_at, updated_at
        FROM client_contacts
        WHERE id = $1 AND client_id = $2
      `, [contactId, clientId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }

      res.json({
        success: true,
        contact: transformToCamelCase(result.rows[0])
      });

    } catch (error) {
      console.error('Error fetching contact:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching contact',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // POST /clients/:clientId/contacts - Create new contact
  // ==========================================================================
  app.post('/clients/:clientId/contacts', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);

      // Convert camelCase to snake_case for database
      const data = transformToSnakeCase(req.body);

      // Validation
      if (!data.name || !data.email) {
        return res.status(400).json({
          success: false,
          message: 'Name and email are required'
        });
      }

      // Insert contact
      const result = await query(`
        INSERT INTO client_contacts (client_id, name, title, email, phone)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        clientId,
        data.name,
        data.title || '',
        data.email,
        data.phone || ''
      ]);

      const contact = result.rows[0];

      // Add timeline event
      await addTimelineEvent(
        clientId,
        'contact_added',
        `Contact "${contact.name}" added`,
        req.body.createdBy
      );

      res.json({
        success: true,
        message: 'Contact created successfully',
        contact: transformToCamelCase(contact)
      });

    } catch (error) {
      console.error('Error creating contact:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'A contact with this email already exists for this client'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error creating contact',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // PUT /clients/:clientId/contacts/:contactId - Update contact
  // ==========================================================================
  app.put('/clients/:clientId/contacts/:contactId', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const contactId = parseInt(req.params.contactId);

      // Get current contact data before update to track changes
      const beforeResult = await query(`
        SELECT * FROM client_contacts
        WHERE id = $1 AND client_id = $2
      `, [contactId, clientId]);

      if (beforeResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }

      const oldContact = beforeResult.rows[0];

      // Convert camelCase to snake_case for database
      const updates = transformToSnakeCase(req.body);

      // Build dynamic UPDATE query
      const allowedFields = ['name', 'title', 'email', 'phone'];
      const setClause = [];
      const values = [];
      let paramCount = 1;

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          setClause.push(`${field} = $${paramCount}`);
          values.push(updates[field]);
          paramCount++;
        }
      }

      if (setClause.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      // Add updated_at
      setClause.push(`updated_at = CURRENT_TIMESTAMP`);

      values.push(contactId, clientId);

      const result = await query(`
        UPDATE client_contacts
        SET ${setClause.join(', ')}
        WHERE id = $${paramCount} AND client_id = $${paramCount + 1}
        RETURNING *
      `, values);

      const contact = result.rows[0];

      // Track changes for timeline
      const changes = [];
      const fieldNames = {
        name: 'Nombre',
        title: 'Cargo',
        email: 'Email',
        phone: 'Teléfono'
      };

      for (const [field, label] of Object.entries(fieldNames)) {
        if (oldContact[field] !== contact[field]) {
          changes.push(`${label}: "${oldContact[field] || 'vacío'}" → "${contact[field] || 'vacío'}"`);
        }
      }

      // Add timeline event with details
      const description = changes.length > 0
        ? `Contacto "${contact.name}" actualizado`
        : `Contacto "${contact.name}" sin cambios`;

      const details = changes.length > 0 ? {
        changes: changes,
        fieldsUpdated: changes.length
      } : null;

      await query(`
        INSERT INTO client_timeline (
          client_id, event_type, event_category, description, details, user_name
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        clientId,
        'contact_updated',
        'contacts',
        description,
        details ? JSON.stringify(details) : null,
        req.body.updatedBy || 'System'
      ]);

      res.json({
        success: true,
        message: 'Contact updated successfully',
        contact: transformToCamelCase(contact)
      });

    } catch (error) {
      console.error('Error updating contact:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'A contact with this email already exists for this client'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error updating contact',
        error: error.message
      });
    }
  });

  // ==========================================================================
  // DELETE /clients/:clientId/contacts/:contactId - Delete contact
  // ==========================================================================
  app.delete('/clients/:clientId/contacts/:contactId', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const contactId = parseInt(req.params.contactId);

      // Get contact info before deleting
      const result = await query(`
        DELETE FROM client_contacts
        WHERE id = $1 AND client_id = $2
        RETURNING *
      `, [contactId, clientId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }

      const contact = result.rows[0];

      // Add timeline event
      await addTimelineEvent(
        clientId,
        'contact_deleted',
        `Contact "${contact.name}" deleted`,
        req.body.deletedBy || req.query.deletedBy
      );

      res.json({
        success: true,
        message: 'Contact deleted successfully',
        contact: transformToCamelCase(contact)
      });

    } catch (error) {
      console.error('Error deleting contact:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting contact',
        error: error.message
      });
    }
  });

};

module.exports = setupClientContactsEndpoints;
