// ============================================================================
// CLIENT PARTS (BOM) ENDPOINTS - PostgreSQL
// ============================================================================
const { query } = require('../config/database');

// GET /clients/:clientId/parts - Get all parts for a client (with hierarchy)
async function getClientParts(req, res) {
  const timestamp = new Date().toISOString();
  const { clientId } = req.params;
  const { activeOnly, flat } = req.query; // flat=true returns flat list, otherwise hierarchical

  console.log(`${timestamp} - GET /clients/${clientId}/parts${activeOnly ? ' (active only)' : ''}${flat ? ' (flat)' : ''}`);

  try {
    // Query to get parts with hierarchy info (unified: project relationship via client_parts.project_id)
    let sql = `
      SELECT
        p.id as project_id,
        p.project_number,
        p.project_name,
        cp.id,
        cp.client_id,
        cp.part_number,
        cp.client_part_number,
        cp.part_name,
        cp.description,
        cp.revision,
        cp.specifications,
        cp.weight,
        cp.snp_quantity,
        cp.snp_volume,
        cp.unit_cost,
        cp.currency,
        cp.active,
        cp.custom_fields,
        cp.parent_part_id,
        cp.level,
        cp.bom_level,
        cp.supplier,
        cp.capture_display_name,
        parent.part_number as parent_part_number,
        parent.part_name as parent_part_name,
        cp.created_at,
        cp.updated_at,
        (SELECT COUNT(*) FROM client_parts children WHERE children.parent_part_id = cp.id) as children_count
      FROM client_parts cp
      LEFT JOIN projects p ON cp.project_id = p.id
      LEFT JOIN client_parts parent ON cp.parent_part_id = parent.id
      WHERE cp.client_id = $1
    `;
    const params = [clientId];

    // Filter by active status if requested
    if (activeOnly === 'true') {
      sql += ' AND cp.active = true';
    }

    sql += ' ORDER BY cp.level, p.project_number NULLS LAST, cp.part_number';

    const result = await query(sql, params);

    // Transform rows to camelCase with hierarchy info
    const transformPart = (row) => ({
      id: row.id,
      clientId: row.client_id,
      partNumber: row.part_number,
      clientPartNumber: row.client_part_number,
      partName: row.part_name,
      description: row.description,
      revision: row.revision,
      specifications: row.specifications,
      weight: row.weight,
      snpQuantity: row.snp_quantity,
      snpVolume: row.snp_volume,
      unitCost: row.unit_cost,
      currency: row.currency,
      active: row.active,
      customFields: row.custom_fields || {},
      parentPartId: row.parent_part_id,
      parentPartNumber: row.parent_part_number,
      parentPartName: row.parent_part_name,
      level: row.level || 0,
      bomLevel: row.bom_level || 1,
      supplier: row.supplier,
      captureDisplayName: row.capture_display_name,
      childrenCount: parseInt(row.children_count) || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      projectId: row.project_id,
      projectNumber: row.project_number,
      projectName: row.project_name
    });

    // If flat mode requested, return simple list
    if (flat === 'true') {
      const parts = result.rows.map(transformPart);
      return res.json({
        success: true,
        parts: parts,
        total: parts.length,
        activeCount: parts.filter(p => p.active).length,
        inactiveCount: parts.filter(p => !p.active).length
      });
    }

    // Build hierarchical structure
    const partsMap = new Map();
    const rootParts = [];

    // First pass: create all parts
    result.rows.forEach(row => {
      const part = transformPart(row);
      part.children = [];
      partsMap.set(part.id, part);
    });

    // Second pass: build tree
    partsMap.forEach(part => {
      if (part.parentPartId && partsMap.has(part.parentPartId)) {
        partsMap.get(part.parentPartId).children.push(part);
      } else {
        rootParts.push(part);
      }
    });

    // Group root parts by project
    const projectsMap = new Map();
    const partsWithoutProject = [];

    rootParts.forEach(part => {
      if (part.projectId) {
        if (!projectsMap.has(part.projectId)) {
          projectsMap.set(part.projectId, {
            projectId: part.projectId,
            projectNumber: part.projectNumber,
            projectName: part.projectName,
            parts: []
          });
        }
        projectsMap.get(part.projectId).parts.push(part);
      } else {
        partsWithoutProject.push(part);
      }
    });

    const projectGroups = Array.from(projectsMap.values());

    // Add unassigned parts as a separate group if any exist
    if (partsWithoutProject.length > 0) {
      projectGroups.push({
        projectId: null,
        projectNumber: 'Sin Asignar',
        projectName: 'Partes sin proyecto asignado',
        parts: partsWithoutProject
      });
    }

    // Calculate totals from unique parts
    const allParts = result.rows.map(row => ({ active: row.active, id: row.id }));
    const uniqueParts = Array.from(new Map(allParts.map(p => [p.id, p])).values());

    res.json({
      success: true,
      projectGroups: projectGroups,
      total: uniqueParts.length,
      rootCount: rootParts.length,
      activeCount: uniqueParts.filter(p => p.active).length,
      inactiveCount: uniqueParts.filter(p => !p.active).length
    });
  } catch (error) {
    console.error('❌ Error fetching client parts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client parts',
      message: error.message
    });
  }
}

// POST /clients/:clientId/parts - Create new part for client (supports subcomponents)
async function createClientPart(req, res) {
  const timestamp = new Date().toISOString();
  const { clientId } = req.params;
  console.log(`${timestamp} - POST /clients/${clientId}/parts`);

  try {
    const {
      partNumber,
      clientPartNumber,
      partName,
      description,
      revision,
      specifications,
      weight,
      snpQuantity,
      snpVolume,
      unitCost,
      currency = 'USD',
      active = true,
      customFields = {},
      parentPartId = null,  // for subcomponents
      projectId = null,     // proyecto asociado
      bomLevel = 1,         // BOM level (1-10)
      supplier = null       // proveedor (texto)
    } = req.body;

    // Validate required fields
    if (!partNumber || !partName) {
      return res.status(400).json({
        success: false,
        error: 'Part number and part name are required'
      });
    }

    // Project is required for new parts
    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Project is required. Please select a project before adding parts.'
      });
    }

    // If parentPartId provided, verify it exists and belongs to same client
    if (parentPartId) {
      const parentCheck = await query(
        'SELECT id, part_number, part_name FROM client_parts WHERE id = $1 AND client_id = $2',
        [parentPartId, clientId]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Parent part not found or belongs to different client'
        });
      }
    }

    // Check for duplicate part number for this client
    const checkDuplicate = await query(
      'SELECT id FROM client_parts WHERE client_id = $1 AND part_number = $2',
      [clientId, partNumber]
    );

    if (checkDuplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Part number already exists for this client'
      });
    }

    const result = await query(
      `INSERT INTO client_parts (
        client_id, part_number, client_part_number, part_name,
        description, revision, specifications, weight,
        snp_quantity, snp_volume, unit_cost, currency, active, custom_fields,
        parent_part_id, project_id, bom_level, supplier
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        clientId, partNumber, clientPartNumber, partName,
        description, revision, specifications, weight,
        snpQuantity, snpVolume, unitCost, currency, active,
        JSON.stringify(customFields),
        parentPartId, projectId, bomLevel, supplier
      ]
    );

    const part = result.rows[0];

    // Log to client timeline
    await query(`
      INSERT INTO client_timeline (
        client_id, event_type, event_category, description, details, user_name
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      clientId,
      'created',
      'part',
      `Parte agregada: ${partNumber} - ${partName}`,
      JSON.stringify({ partId: part.id, partNumber, partName, active }),
      'System' // TODO: Replace with actual user
    ]);

    console.log('✅ Client part created:', part.id, projectId ? `(project ${projectId})` : '(no project)');
    res.status(201).json({
      success: true,
      part: {
        id: part.id,
        clientId: part.client_id,
        projectId: part.project_id,
        partNumber: part.part_number,
        clientPartNumber: part.client_part_number,
        partName: part.part_name,
        description: part.description,
        revision: part.revision,
        specifications: part.specifications,
        weight: part.weight,
        snpQuantity: part.snp_quantity,
        snpVolume: part.snp_volume,
        unitCost: part.unit_cost,
        currency: part.currency,
        active: part.active,
        customFields: part.custom_fields,
        parentPartId: part.parent_part_id,
        level: part.level,
        bomLevel: part.bom_level,
        supplier: part.supplier,
        createdAt: part.created_at,
        updatedAt: part.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Error creating client part:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create client part',
      message: error.message
    });
  }
}

// PUT /clients/:clientId/parts/:partId - Update part (supports moving in hierarchy)
async function updateClientPart(req, res) {
  const timestamp = new Date().toISOString();
  const { clientId, partId } = req.params;
  console.log(`${timestamp} - PUT /clients/${clientId}/parts/${partId}`);

  try {
    const {
      partNumber,
      clientPartNumber,
      partName,
      description,
      revision,
      specifications,
      weight,
      snpQuantity,
      snpVolume,
      unitCost,
      currency,
      active,
      customFields,
      parentPartId,  // can move part to different parent
      bomLevel,      // BOM level (1-10)
      supplier       // proveedor (texto)
    } = req.body;

    // Get current part to check changes
    const currentPart = await query(
      'SELECT * FROM client_parts WHERE id = $1 AND client_id = $2',
      [partId, clientId]
    );

    if (currentPart.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Part not found'
      });
    }

    const oldPart = currentPart.rows[0];

    // Check for duplicate part number if changing it
    if (partNumber && partNumber !== oldPart.part_number) {
      const checkDuplicate = await query(
        'SELECT id FROM client_parts WHERE client_id = $1 AND part_number = $2 AND id != $3',
        [clientId, partNumber, partId]
      );

      if (checkDuplicate.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Part number already exists for this client'
        });
      }
    }

    // Validate parentPartId if provided
    if (parentPartId !== undefined) {
      if (parentPartId !== null) {
        // Can't be its own parent
        if (parseInt(parentPartId) === parseInt(partId)) {
          return res.status(400).json({
            success: false,
            error: 'A part cannot be its own parent'
          });
        }
        // Check parent exists and belongs to same client
        const parentCheck = await query(
          'SELECT id FROM client_parts WHERE id = $1 AND client_id = $2',
          [parentPartId, clientId]
        );
        if (parentCheck.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Parent part not found or belongs to different client'
          });
        }
        // Check not creating circular reference (parent is not a descendant)
        const descendantCheck = await query(
          'SELECT * FROM get_part_descendants($1) WHERE id = $2',
          [partId, parentPartId]
        );
        if (descendantCheck.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Cannot set parent: would create circular reference'
          });
        }
      }
    }

    const result = await query(
      `UPDATE client_parts SET
        part_number = COALESCE($1, part_number),
        client_part_number = COALESCE($2, client_part_number),
        part_name = COALESCE($3, part_name),
        description = COALESCE($4, description),
        revision = COALESCE($5, revision),
        specifications = COALESCE($6, specifications),
        weight = COALESCE($7, weight),
        snp_quantity = COALESCE($8, snp_quantity),
        snp_volume = COALESCE($9, snp_volume),
        unit_cost = COALESCE($10, unit_cost),
        currency = COALESCE($11, currency),
        active = COALESCE($12, active),
        custom_fields = COALESCE($13, custom_fields),
        parent_part_id = CASE WHEN $16 THEN $14 ELSE parent_part_id END,
        bom_level = COALESCE($18, bom_level),
        supplier = CASE WHEN $19 THEN $20 ELSE supplier END
      WHERE id = $15 AND client_id = $17
      RETURNING *`,
      [
        partNumber, clientPartNumber, partName, description, revision,
        specifications, weight, snpQuantity, snpVolume, unitCost, currency,
        active, customFields ? JSON.stringify(customFields) : null,
        parentPartId, partId, parentPartId !== undefined, clientId,
        bomLevel, supplier !== undefined, supplier
      ]
    );

    const part = result.rows[0];

    // Track changes
    const changes = [];
    if (oldPart.part_number !== part.part_number) {
      changes.push(`Número de parte: ${oldPart.part_number} → ${part.part_number}`);
    }
    if (oldPart.active !== part.active) {
      changes.push(`Estado: ${oldPart.active ? 'Activo' : 'Inactivo'} → ${part.active ? 'Activo' : 'Inactivo'}`);
    }

    // Log to timeline if there were changes
    if (changes.length > 0) {
      await query(`
        INSERT INTO client_timeline (
          client_id, event_type, event_category, description, details, user_name
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        clientId,
        'updated',
        'part',
        `Parte actualizada: ${part.part_number}`,
        JSON.stringify({ partId: part.id, changes }),
        'System' // TODO: Replace with actual user
      ]);
    }

    console.log('✅ Client part updated:', partId);
    res.json({
      success: true,
      part: {
        id: part.id,
        clientId: part.client_id,
        partNumber: part.part_number,
        clientPartNumber: part.client_part_number,
        partName: part.part_name,
        description: part.description,
        revision: part.revision,
        specifications: part.specifications,
        weight: part.weight,
        snpQuantity: part.snp_quantity,
        snpVolume: part.snp_volume,
        unitCost: part.unit_cost,
        currency: part.currency,
        active: part.active,
        customFields: part.custom_fields,
        parentPartId: part.parent_part_id,
        level: part.level,
        bomLevel: part.bom_level,
        supplier: part.supplier,
        createdAt: part.created_at,
        updatedAt: part.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Error updating client part:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update client part',
      message: error.message
    });
  }
}

// DELETE /clients/:clientId/parts/:partId - Delete part
async function deleteClientPart(req, res) {
  const timestamp = new Date().toISOString();
  const { clientId, partId } = req.params;
  console.log(`${timestamp} - DELETE /clients/${clientId}/parts/${partId}`);

  try {
    // Get part info before deleting
    const partInfo = await query(
      'SELECT part_number, part_name FROM client_parts WHERE id = $1 AND client_id = $2',
      [partId, clientId]
    );

    if (partInfo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Part not found'
      });
    }

    const { part_number, part_name } = partInfo.rows[0];

    // Delete the part
    await query(
      'DELETE FROM client_parts WHERE id = $1 AND client_id = $2',
      [partId, clientId]
    );

    // Log to timeline
    await query(`
      INSERT INTO client_timeline (
        client_id, event_type, event_category, description, details, user_name
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      clientId,
      'deleted',
      'part',
      `Parte eliminada: ${part_number} - ${part_name}`,
      JSON.stringify({ partId, partNumber: part_number, partName: part_name }),
      'System' // TODO: Replace with actual user
    ]);

    console.log('✅ Client part deleted:', partId);
    res.json({
      success: true,
      message: 'Part deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting client part:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete client part',
      message: error.message
    });
  }
}

// PATCH /clients/:clientId/parts/:partId/toggle-active - Toggle active status
async function togglePartActive(req, res) {
  const timestamp = new Date().toISOString();
  const { clientId, partId } = req.params;
  console.log(`${timestamp} - PATCH /clients/${clientId}/parts/${partId}/toggle-active`);

  try {
    // Get current part
    const currentPart = await query(
      'SELECT * FROM client_parts WHERE id = $1 AND client_id = $2',
      [partId, clientId]
    );

    if (currentPart.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Part not found'
      });
    }

    const oldActive = currentPart.rows[0].active;
    const newActive = !oldActive;

    // Toggle active status
    const result = await query(
      'UPDATE client_parts SET active = $1 WHERE id = $2 AND client_id = $3 RETURNING *',
      [newActive, partId, clientId]
    );

    const part = result.rows[0];

    // Log to timeline
    await query(`
      INSERT INTO client_timeline (
        client_id, event_type, event_category, description, details, user_name
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      clientId,
      'updated',
      'part',
      `Parte ${newActive ? 'activada' : 'desactivada'}: ${part.part_number}`,
      JSON.stringify({
        partId: part.id,
        partNumber: part.part_number,
        oldActive,
        newActive
      }),
      'System' // TODO: Replace with actual user
    ]);

    console.log(`✅ Part ${partId} ${newActive ? 'activated' : 'deactivated'}`);
    res.json({
      success: true,
      part: {
        id: part.id,
        clientId: part.client_id,
        partNumber: part.part_number,
        clientPartNumber: part.client_part_number,
        partName: part.part_name,
        description: part.description,
        revision: part.revision,
        specifications: part.specifications,
        weight: part.weight,
        snpQuantity: part.snp_quantity,
        snpVolume: part.snp_volume,
        unitCost: part.unit_cost,
        currency: part.currency,
        active: part.active,
        customFields: part.custom_fields,
        createdAt: part.created_at,
        updatedAt: part.updated_at
      }
    });
  } catch (error) {
    console.error('❌ Error toggling part active status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle part active status',
      message: error.message
    });
  }
}

// GET /clients/parts/all - Get ALL parts from ALL clients (Global BOM)
async function getAllClientsParts(req, res) {
  const timestamp = new Date().toISOString();
  const { activeOnly } = req.query;

  console.log(`${timestamp} - GET /clients/parts/all${activeOnly ? ' (active only)' : ''}`);

  try {
    let sql = `
      SELECT
        cp.*,
        c.name as client_name,
        c.alias as client_alias,
        c.vendor_number as client_vendor_number,
        p.id as project_id,
        p.project_number,
        p.project_name,
        parent.part_number as parent_part_number,
        (SELECT COUNT(*) FROM client_parts children WHERE children.parent_part_id = cp.id) as children_count
      FROM client_parts cp
      INNER JOIN clients c ON cp.client_id = c.id
      LEFT JOIN projects p ON cp.project_id = p.id
      LEFT JOIN client_parts parent ON cp.parent_part_id = parent.id
    `;

    if (activeOnly === 'true') {
      sql += ' WHERE cp.active = true';
    }

    sql += ' ORDER BY c.name, p.project_number, cp.part_number';

    const result = await query(sql);

    // Transform to camelCase and collect all unique custom field names
    const allCustomFieldNames = new Set();
    const partsMap = new Map();

    // First pass: create all parts
    result.rows.forEach(part => {
      // Collect custom field names
      if (part.custom_fields && typeof part.custom_fields === 'object') {
        Object.keys(part.custom_fields).forEach(fieldName => {
          allCustomFieldNames.add(fieldName);
        });
      }

      const transformedPart = {
        id: part.id,
        clientId: part.client_id,
        clientName: part.client_name,
        clientAlias: part.client_alias,
        clientVendorNumber: part.client_vendor_number,
        projectId: part.project_id,
        projectNumber: part.project_number,
        projectName: part.project_name,
        partNumber: part.part_number,
        clientPartNumber: part.client_part_number,
        partName: part.part_name,
        captureDisplayName: part.capture_display_name,
        description: part.description,
        revision: part.revision,
        specifications: part.specifications,
        weight: part.weight,
        snpQuantity: part.snp_quantity,
        snpVolume: part.snp_volume,
        unitCost: part.unit_cost,
        currency: part.currency,
        active: part.active,
        customFields: part.custom_fields || {},
        parentPartId: part.parent_part_id,
        parentPartNumber: part.parent_part_number,
        bomLevel: part.bom_level || 1,
        childrenCount: parseInt(part.children_count) || 0,
        children: [],
        createdAt: part.created_at,
        updatedAt: part.updated_at
      };

      partsMap.set(transformedPart.id, transformedPart);
    });

    // Second pass: build tree
    const rootParts = [];
    partsMap.forEach(part => {
      if (part.parentPartId && partsMap.has(part.parentPartId)) {
        partsMap.get(part.parentPartId).children.push(part);
      } else {
        rootParts.push(part);
      }
    });

    // Flatten tree with depth for display
    const flattenWithDepth = (parts, depth = 0) => {
      const result = [];
      parts.forEach(part => {
        result.push({ ...part, _depth: depth });
        if (part.children && part.children.length > 0) {
          result.push(...flattenWithDepth(part.children, depth + 1));
        }
      });
      return result;
    };

    const flatParts = flattenWithDepth(rootParts);

    res.json({
      success: true,
      parts: flatParts,
      total: flatParts.length,
      activeCount: flatParts.filter(p => p.active).length,
      inactiveCount: flatParts.filter(p => !p.active).length,
      allCustomFieldNames: Array.from(allCustomFieldNames).sort() // All unique custom field names across all clients
    });
  } catch (error) {
    console.error('❌ Error fetching all clients parts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch all clients parts',
      message: error.message
    });
  }
}

// GET /parts/defects?partIds=1,2,3 - Get defects configured for multiple parts
async function getPartsDefects(req, res) {
  const { partIds } = req.query;

  if (!partIds) {
    return res.status(400).json({ success: false, message: 'partIds query parameter is required' });
  }

  const partIdArray = partIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

  if (partIdArray.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid part IDs provided' });
  }

  try {
    const result = await query(`
      SELECT DISTINCT
        pdc.id,
        pdc.part_id,
        pdc.defect_type_id,
        pdc.display_name,
        dt.code,
        dt.name,
        dt.category_id,
        dc.name as category_name,
        dc.display_order as category_display_order,
        dt.display_order as defect_display_order
      FROM part_defect_config pdc
      JOIN defect_types dt ON pdc.defect_type_id = dt.id
      LEFT JOIN defect_categories dc ON dt.category_id = dc.id
      WHERE pdc.part_id = ANY($1)
        AND pdc.is_active = true
        AND dt.is_active = true
      ORDER BY dc.display_order, dc.name, dt.display_order, dt.name
    `, [partIdArray]);

    // Remove duplicates by defect_type_id (same defect can be in multiple parts)
    const seen = new Set();
    const defects = result.rows.filter(d => {
      if (seen.has(d.defect_type_id)) return false;
      seen.add(d.defect_type_id);
      return true;
    }).map(row => ({
      id: row.id,
      partId: row.part_id,
      defectTypeId: row.defect_type_id,
      displayName: row.display_name,
      code: row.code,
      name: row.name,
      categoryId: row.category_id,
      categoryName: row.category_name
    }));

    res.json({ success: true, defects });
  } catch (error) {
    console.error('❌ Error fetching parts defects:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch parts defects', message: error.message });
  }
}

module.exports = {
  getClientParts,
  createClientPart,
  updateClientPart,
  deleteClientPart,
  togglePartActive,
  getAllClientsParts,
  getPartsDefects
};
