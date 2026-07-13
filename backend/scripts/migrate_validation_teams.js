const { pool } = require('../config/database');

async function migrateValidationTeams() {
  try {
    // Get all users
    const usersResult = await pool.query('SELECT id, first_name, last_name FROM users');
    const usersMap = {};
    usersResult.rows.forEach(u => {
      usersMap[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    });

    console.log('Usuarios cargados:', Object.keys(usersMap).length);

    // Get ECRs with validation_teams
    const ecrsResult = await pool.query('SELECT id, ecr_number, validation_teams FROM ecr_reports WHERE validation_teams IS NOT NULL');

    console.log('ECRs con validation_teams:', ecrsResult.rows.length);

    let updated = 0;
    for (const ecr of ecrsResult.rows) {
      const vt = ecr.validation_teams;
      if (!vt || typeof vt !== 'object') continue;

      let needsUpdate = false;
      const newVt = {};

      for (const [area, members] of Object.entries(vt)) {
        if (!Array.isArray(members)) continue;

        // Check if any member is just an ID (not an object)
        const hasOldFormat = members.some(m => typeof m === 'number');

        if (hasOldFormat) {
          needsUpdate = true;
          newVt[area] = members.map(m => {
            if (typeof m === 'object') return m;
            return { id: m, name: usersMap[m] || `Usuario ${m}` };
          });
        } else {
          newVt[area] = members;
        }
      }

      if (needsUpdate) {
        await pool.query('UPDATE ecr_reports SET validation_teams = $1 WHERE id = $2', [JSON.stringify(newVt), ecr.id]);
        console.log('Migrado:', ecr.ecr_number);
        updated++;
      }
    }

    console.log('Total migrados:', updated);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

migrateValidationTeams();
