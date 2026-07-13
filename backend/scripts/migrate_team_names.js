const { pool } = require('../config/database');

async function migrateTeamNames() {
  try {
    // Get all users
    const usersResult = await pool.query('SELECT id, first_name, last_name FROM users');
    const usersMap = {};
    usersResult.rows.forEach(u => {
      usersMap[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    });

    console.log('Usuarios cargados:', Object.keys(usersMap).length);

    // Get all ECRs
    const ecrsResult = await pool.query('SELECT id, ecr_number, review_board, validation_teams FROM ecr_reports');

    console.log('ECRs a procesar:', ecrsResult.rows.length);

    let updated = 0;
    for (const ecr of ecrsResult.rows) {
      let needsUpdate = false;
      const updates = {};

      // Migrate review_board
      const rb = ecr.review_board;
      if (rb && typeof rb === 'object') {
        const hasOldFormat = Array.isArray(rb.members) && rb.members.some(m => typeof m === 'number');

        if (hasOldFormat) {
          needsUpdate = true;
          updates.review_board = {
            ...rb,
            members: rb.members.map(m => {
              if (typeof m === 'object') return m;
              return { id: m, name: usersMap[m] || `Usuario ${m}` };
            }),
            primary: typeof rb.primary === 'number'
              ? { id: rb.primary, name: usersMap[rb.primary] || `Usuario ${rb.primary}` }
              : rb.primary
          };
        }
      }

      // Migrate validation_teams (in case some weren't migrated)
      const vt = ecr.validation_teams;
      if (vt && typeof vt === 'object') {
        let vtNeedsUpdate = false;
        const newVt = {};

        for (const [area, members] of Object.entries(vt)) {
          if (!Array.isArray(members)) {
            newVt[area] = members;
            continue;
          }

          const hasOldFormat = members.some(m => typeof m === 'number');
          if (hasOldFormat) {
            vtNeedsUpdate = true;
            newVt[area] = members.map(m => {
              if (typeof m === 'object') return m;
              return { id: m, name: usersMap[m] || `Usuario ${m}` };
            });
          } else {
            newVt[area] = members;
          }
        }

        if (vtNeedsUpdate) {
          needsUpdate = true;
          updates.validation_teams = newVt;
        }
      }

      if (needsUpdate) {
        const setClauses = [];
        const values = [];
        let paramIndex = 1;

        if (updates.review_board) {
          setClauses.push(`review_board = $${paramIndex++}`);
          values.push(JSON.stringify(updates.review_board));
        }
        if (updates.validation_teams) {
          setClauses.push(`validation_teams = $${paramIndex++}`);
          values.push(JSON.stringify(updates.validation_teams));
        }

        if (setClauses.length > 0) {
          values.push(ecr.id);
          await pool.query(
            `UPDATE ecr_reports SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
            values
          );
          console.log('Migrado:', ecr.ecr_number, '- Campos:', Object.keys(updates).join(', '));
          updated++;
        }
      }
    }

    console.log('\nTotal migrados:', updated);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

migrateTeamNames();
