// ============================================================================
// CLIENTS ENDPOINTS - PostgreSQL
// ============================================================================
const { query } = require('../config/database');

// GET /clients/list - List all clients
async function getClientsList(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - GET /clients/list`);

  try {
    const result = await query(`
      SELECT
        id, name, alias, vendor_number,
        corporate_address, corporate_phone, corporate_fax, email,
        billing_address, billing_frequency, billing_period,
        website, is_active, requires_signature,
        created_at, updated_at
      FROM clients
      ORDER BY name
    `);

    // Transform snake_case to camelCase for frontend
    const clients = result.rows.map(client => ({
      id: client.id,
      name: client.name,
      alias: client.alias,
      vendorNumber: client.vendor_number,
      corporateAddress: client.corporate_address,
      corporatePhone: client.corporate_phone,
      corporateFax: client.corporate_fax,
      email: client.email,
      billingAddress: client.billing_address,
      billingFrequency: client.billing_frequency,
      billingPeriod: client.billing_period,
      website: client.website,
      isActive: client.is_active,
      requiresSignature: client.requires_signature,
      createdAt: client.created_at,
      updatedAt: client.updated_at
    }));

    // Calculate stats
    const stats = {
      total: clients.length,
      active: clients.filter(c => c.isActive).length,
      inactive: clients.filter(c => !c.isActive).length,
      withVendorNumber: clients.filter(c => c.vendorNumber && c.vendorNumber.trim() !== '').length
    };

    res.json({
      success: true,
      clients: clients,
      stats: stats
    });
  } catch (error) {
    console.error('❌ Error fetching clients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch clients',
      message: error.message
    });
  }
}

// GET /clients/:id - Get single client
async function getClientById(req, res) {
  const timestamp = new Date().toISOString();
  const { id } = req.params;
  console.log(`${timestamp} - GET /clients/${id}`);

  try {
    const result = await query(
      'SELECT * FROM clients WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    const client = result.rows[0];

    // Get contacts for this client
    const contactsResult = await query(
      'SELECT id, name, title, email, phone FROM client_contacts WHERE client_id = $1 ORDER BY name',
      [id]
    );

    // Get documents for this client (if needed in the future)
    // For now, return empty array as documents are handled separately
    const documentsResult = { rows: [] };

    const transformedClient = {
      id: client.id,
      name: client.name,
      alias: client.alias,
      vendorNumber: client.vendor_number,
      corporateAddress: client.corporate_address,
      corporatePhone: client.corporate_phone,
      corporateFax: client.corporate_fax,
      email: client.email,
      billingAddress: client.billing_address,
      billingFrequency: client.billing_frequency,
      billingPeriod: client.billing_period,
      website: client.website,
      isActive: client.is_active,
      requiresSignature: client.requires_signature,
      d4ResponseTimeHours: client.d4_response_time_hours,
      d5ResponseTimeHours: client.d5_response_time_hours,
      contacts: contactsResult.rows.map(c => ({
        id: c.id,
        name: c.name,
        title: c.title,
        email: c.email,
        phone: c.phone
      })),
      documents: documentsResult.rows.map(d => ({
        id: d.id,
        name: d.title,
        type: d.file_type,
        description: d.description,
        fileName: d.file_name,
        fileSize: d.file_size,
        uploadDate: d.created_at
      })),
      createdAt: client.created_at,
      updatedAt: client.updated_at
    };

    res.json({
      success: true,
      client: transformedClient
    });
  } catch (error) {
    console.error('❌ Error fetching client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client',
      message: error.message
    });
  }
}

// POST /clients/create - Create new client
async function createClient(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - POST /clients/create`);

  try {
    const {
      name,
      alias,
      vendor_number,
      corporate_address,
      corporate_phone,
      corporate_fax,
      email,
      billing_address,
      billing_frequency,
      billing_period,
      website,
      is_active = true,
      requires_signature = false,
      d4ResponseTimeHours = 24,
      d5ResponseTimeHours = 48,
      contacts = []
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Client name is required'
      });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Insert client
      const result = await query(
        `INSERT INTO clients (
          name, alias, vendor_number, corporate_address, corporate_phone,
          corporate_fax, email, billing_address, billing_frequency, billing_period,
          website, is_active, requires_signature, d4_response_time_hours, d5_response_time_hours
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          name, alias, vendor_number, corporate_address, corporate_phone,
          corporate_fax, email, billing_address, billing_frequency, billing_period,
          website, is_active, requires_signature, d4ResponseTimeHours, d5ResponseTimeHours
        ]
      );

      const clientId = result.rows[0].id;

      // Insert contacts
      for (const contact of contacts) {
        if (contact.name && contact.email) {
          await query(
            `INSERT INTO client_contacts (client_id, name, title, email, phone)
             VALUES ($1, $2, $3, $4, $5)`,
            [clientId, contact.name, contact.title || '', contact.email, contact.phone || '']
          );
        }
      }

      // Commit transaction
      await query('COMMIT');

      console.log('✅ Client created:', clientId);
      res.status(201).json({
        success: true,
        client: result.rows[0]
      });
    } catch (error) {
      // Rollback on error
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ Error creating client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create client',
      message: error.message
    });
  }
}

// PUT /clients/:id - Update client
async function updateClient(req, res) {
  const timestamp = new Date().toISOString();
  const { id } = req.params;
  console.log(`${timestamp} - PUT /clients/${id}`);

  try {
    const {
      name,
      alias,
      vendor_number,
      corporate_address,
      corporate_phone,
      corporate_fax,
      email,
      billing_address,
      billing_frequency,
      billing_period,
      website,
      is_active,
      requires_signature,
      d4ResponseTimeHours,
      d5ResponseTimeHours,
      contacts = []
    } = req.body;

    // Start transaction
    await query('BEGIN');

    try {
      // Get current client data before update to track changes
      const beforeUpdate = await query('SELECT * FROM clients WHERE id = $1', [id]);

      if (beforeUpdate.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }

      const oldClient = beforeUpdate.rows[0];

      // Update client
      const result = await query(
        `UPDATE clients SET
          name = COALESCE($1, name),
          alias = COALESCE($2, alias),
          vendor_number = COALESCE($3, vendor_number),
          corporate_address = COALESCE($4, corporate_address),
          corporate_phone = COALESCE($5, corporate_phone),
          corporate_fax = COALESCE($6, corporate_fax),
          email = COALESCE($7, email),
          billing_address = COALESCE($8, billing_address),
          billing_frequency = COALESCE($9, billing_frequency),
          billing_period = COALESCE($10, billing_period),
          website = COALESCE($11, website),
          is_active = COALESCE($12, is_active),
          requires_signature = COALESCE($13, requires_signature),
          d4_response_time_hours = COALESCE($14, d4_response_time_hours),
          d5_response_time_hours = COALESCE($15, d5_response_time_hours),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $16
        RETURNING *`,
        [
          name, alias, vendor_number, corporate_address, corporate_phone,
          corporate_fax, email, billing_address, billing_frequency, billing_period,
          website, is_active, requires_signature, d4ResponseTimeHours, d5ResponseTimeHours, id
        ]
      );

      const newClient = result.rows[0];

      // Track changes for timeline
      const changes = [];
      const fieldNames = {
        name: 'Nombre',
        alias: 'Alias',
        vendor_number: 'Número de Proveedor',
        corporate_address: 'Dirección Corporativa',
        corporate_phone: 'Teléfono Corporativo',
        corporate_fax: 'Fax Corporativo',
        email: 'Email Corporativo',
        billing_address: 'Dirección de Facturación',
        billing_frequency: 'Frecuencia de Facturación',
        billing_period: 'Período de Facturación',
        website: 'Sitio Web',
        is_active: 'Estado Activo',
        requires_signature: 'Requiere Firma',
        d4_response_time_hours: 'Tiempo de Respuesta D4',
        d5_response_time_hours: 'Tiempo de Respuesta D5'
      };

      for (const [field, label] of Object.entries(fieldNames)) {
        if (oldClient[field] !== newClient[field]) {
          changes.push(`${label}: "${oldClient[field] || 'vacío'}" → "${newClient[field] || 'vacío'}"`);
        }
      }

      // Log changes to timeline if any changes were made
      if (changes.length > 0) {
        const description = `Información del cliente actualizada`;
        const details = {
          changes: changes,
          fieldsUpdated: changes.length
        };

        await query(`
          INSERT INTO client_timeline (
            client_id, event_type, event_category, description, details, user_name
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          id,
          'updated',
          'client',
          description,
          JSON.stringify(details),
          'System' // TODO: Replace with actual user name from auth
        ]);

        console.log(`📝 Timeline event created: ${changes.length} fields updated`);
      }

      // Delete existing contacts
      await query('DELETE FROM client_contacts WHERE client_id = $1', [id]);

      // Insert new contacts
      for (const contact of contacts) {
        if (contact.name && contact.email) {
          await query(
            `INSERT INTO client_contacts (client_id, name, title, email, phone)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, contact.name, contact.title || '', contact.email, contact.phone || '']
          );
        }
      }

      // Commit transaction
      await query('COMMIT');

      console.log('✅ Client updated:', id);
      res.json({
        success: true,
        client: result.rows[0]
      });
    } catch (error) {
      // Rollback on error
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ Error updating client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update client',
      message: error.message
    });
  }
}

// DELETE /clients/:id - Delete client
async function deleteClient(req, res) {
  const timestamp = new Date().toISOString();
  const { id } = req.params;
  console.log(`${timestamp} - DELETE /clients/${id}`);

  try {
    const result = await query(
      'DELETE FROM clients WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    console.log('✅ Client deleted:', id);
    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting client:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete client',
      message: error.message
    });
  }
}

module.exports = {
  getClientsList,
  getClientById,
  createClient,
  updateClient,
  deleteClient
};
