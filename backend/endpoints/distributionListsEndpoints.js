const { query } = require('../config/database');

/**
 * GET /distribution-lists
 * Get all distribution lists (optionally filter by created_by)
 */
async function getDistributionLists(req, res) {
  try {
    const { created_by } = req.query;

    let queryText = `
      SELECT
        dl.id,
        dl.name,
        dl.description,
        dl.user_ids,
        dl.created_by,
        dl.created_at,
        dl.updated_at,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM distribution_lists dl
      LEFT JOIN users u ON dl.created_by = u.id
    `;

    const values = [];
    if (created_by) {
      queryText += ' WHERE dl.created_by = $1';
      values.push(created_by);
    }

    queryText += ' ORDER BY dl.name ASC';

    const result = await query(queryText, values);

    // For each distribution list, fetch user details
    const listsWithUsers = await Promise.all(
      result.rows.map(async (list) => {
        if (list.user_ids && list.user_ids.length > 0) {
          const usersResult = await query(
            `SELECT id, first_name, last_name, email, position
             FROM users
             WHERE id = ANY($1::int[])`,
            [list.user_ids]
          );
          return {
            ...list,
            users: usersResult.rows
          };
        }
        return {
          ...list,
          users: []
        };
      })
    );

    res.json(listsWithUsers);
  } catch (error) {
    console.error('Error fetching distribution lists:', error);
    res.status(500).json({ error: 'Failed to fetch distribution lists' });
  }
}

/**
 * GET /distribution-lists/:id
 * Get a single distribution list by ID
 */
async function getDistributionListById(req, res) {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT
        dl.id,
        dl.name,
        dl.description,
        dl.user_ids,
        dl.created_by,
        dl.created_at,
        dl.updated_at,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM distribution_lists dl
      LEFT JOIN users u ON dl.created_by = u.id
      WHERE dl.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Distribution list not found' });
    }

    const list = result.rows[0];

    // Fetch user details
    if (list.user_ids && list.user_ids.length > 0) {
      const usersResult = await query(
        `SELECT id, first_name, last_name, email, position
         FROM users
         WHERE id = ANY($1::int[])`,
        [list.user_ids]
      );
      list.users = usersResult.rows;
    } else {
      list.users = [];
    }

    res.json(list);
  } catch (error) {
    console.error('Error fetching distribution list:', error);
    res.status(500).json({ error: 'Failed to fetch distribution list' });
  }
}

/**
 * POST /distribution-lists
 * Create a new distribution list
 */
async function createDistributionList(req, res) {
  try {
    const { name, description, user_ids } = req.body;
    const created_by = req.user.id; // From auth middleware

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'At least one user must be selected' });
    }

    // Check if name already exists
    const existingList = await query(
      'SELECT id FROM distribution_lists WHERE name = $1',
      [name.trim()]
    );

    if (existingList.rows.length > 0) {
      return res.status(400).json({ error: 'A distribution list with this name already exists' });
    }

    const result = await query(
      `INSERT INTO distribution_lists (name, description, user_ids, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, user_ids, created_by, created_at, updated_at`,
      [name.trim(), description || null, user_ids, created_by]
    );

    const newList = result.rows[0];

    // Fetch user details for response
    const usersResult = await query(
      `SELECT id, first_name, last_name, email, position
       FROM users
       WHERE id = ANY($1::int[])`,
      [user_ids]
    );
    newList.users = usersResult.rows;

    res.status(201).json(newList);
  } catch (error) {
    console.error('Error creating distribution list:', error);
    res.status(500).json({ error: 'Failed to create distribution list' });
  }
}

/**
 * PUT /distribution-lists/:id
 * Update an existing distribution list
 */
async function updateDistributionList(req, res) {
  try {
    const { id } = req.params;
    const { name, description, user_ids } = req.body;
    const user_id = req.user.id;

    // Check if list exists and user has permission
    const existingList = await query(
      'SELECT created_by FROM distribution_lists WHERE id = $1',
      [id]
    );

    if (existingList.rows.length === 0) {
      return res.status(404).json({ error: 'Distribution list not found' });
    }

    // Only creator or admin can update
    if (existingList.rows[0].created_by !== user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to update this list' });
    }

    if (name && !name.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }

    if (user_ids && (!Array.isArray(user_ids) || user_ids.length === 0)) {
      return res.status(400).json({ error: 'At least one user must be selected' });
    }

    // Check if new name already exists (excluding current list)
    if (name) {
      const nameCheck = await query(
        'SELECT id FROM distribution_lists WHERE name = $1 AND id != $2',
        [name.trim(), id]
      );

      if (nameCheck.rows.length > 0) {
        return res.status(400).json({ error: 'A distribution list with this name already exists' });
      }
    }

    const result = await query(
      `UPDATE distribution_lists
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           user_ids = COALESCE($3, user_ids),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, name, description, user_ids, created_by, created_at, updated_at`,
      [name?.trim() || null, description || null, user_ids || null, id]
    );

    const updatedList = result.rows[0];

    // Fetch user details
    if (updatedList.user_ids && updatedList.user_ids.length > 0) {
      const usersResult = await query(
        `SELECT id, first_name, last_name, email, position
         FROM users
         WHERE id = ANY($1::int[])`,
        [updatedList.user_ids]
      );
      updatedList.users = usersResult.rows;
    } else {
      updatedList.users = [];
    }

    res.json(updatedList);
  } catch (error) {
    console.error('Error updating distribution list:', error);
    res.status(500).json({ error: 'Failed to update distribution list' });
  }
}

/**
 * DELETE /distribution-lists/:id
 * Delete a distribution list
 */
async function deleteDistributionList(req, res) {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Check if list exists and user has permission
    const existingList = await query(
      'SELECT created_by FROM distribution_lists WHERE id = $1',
      [id]
    );

    if (existingList.rows.length === 0) {
      return res.status(404).json({ error: 'Distribution list not found' });
    }

    // Only creator or admin can delete
    if (existingList.rows[0].created_by !== user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to delete this list' });
    }

    await query('DELETE FROM distribution_lists WHERE id = $1', [id]);

    res.json({ message: 'Distribution list deleted successfully' });
  } catch (error) {
    console.error('Error deleting distribution list:', error);
    res.status(500).json({ error: 'Failed to delete distribution list' });
  }
}

module.exports = {
  getDistributionLists,
  getDistributionListById,
  createDistributionList,
  updateDistributionList,
  deleteDistributionList
};
