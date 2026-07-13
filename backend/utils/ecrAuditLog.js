const { pool } = require('../config/database');

async function logECRAction({
  ecrId,
  actionType,
  actionCategory = 'report',
  sectionName = null,
  userId = null,
  userName = null,
  description,
  oldValue = null,
  newValue = null
}) {
  try {
    let resolvedName = userName;
    if (!resolvedName && userId) {
      const userResult = await pool.query(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [userId]
      );
      if (userResult.rows.length > 0) {
        const u = userResult.rows[0];
        resolvedName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
      }
    }
    resolvedName = resolvedName || 'Sistema';

    await pool.query(
      `INSERT INTO ecr_audit_log
        (ecr_id, action_type, action_category, section_name, user_id, user_name, description, old_value, new_value)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        ecrId,
        actionType,
        actionCategory,
        sectionName,
        userId,
        resolvedName,
        description,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null
      ]
    );
  } catch (err) {
    console.error('ECR audit log error:', err);
  }
}

async function getECRAuditLog(ecrId, { limit = 200, offset = 0 } = {}) {
  try {
    const result = await pool.query(
      `SELECT id, action_type, action_category, section_name, user_id, user_name,
              description, old_value, new_value, created_at
       FROM ecr_audit_log
       WHERE ecr_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [ecrId, limit, offset]
    );
    return result.rows;
  } catch (err) {
    console.error('ECR audit log fetch error:', err);
    return [];
  }
}

module.exports = { logECRAction, getECRAuditLog };
