/**
 * Migration Script: 8D Frozen Names
 *
 * Ensures all escalation_path user objects have the 'name' field
 * properly set with the user's full name at the time of assignment.
 *
 * Run: node migrations/migrate_8d_frozen_names.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'apqp_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function getUserName(userId) {
  if (!userId) return null;
  const result = await pool.query(
    `SELECT first_name || ' ' || last_name as full_name FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0]?.full_name || `Usuario #${userId}`;
}

async function migrate8DFrozenNames() {
  const client = await pool.connect();

  try {
    console.log('=== 8D Frozen Names Migration ===\n');

    // Get all reports with escalation_path
    const reports = await client.query(`
      SELECT id, escalation_path
      FROM eightd_reports
      WHERE escalation_path IS NOT NULL
        AND escalation_path != '{}'::jsonb
        AND escalation_path != 'null'::jsonb
    `);

    console.log(`Found ${reports.rows.length} reports with escalation_path\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const report of reports.rows) {
      let escalationPath = report.escalation_path;
      let needsUpdate = false;

      // Process each user array
      const userArrays = ['issue_users', 'countermeasure_users', 'confirmation_users'];

      for (const arrayName of userArrays) {
        if (escalationPath[arrayName] && Array.isArray(escalationPath[arrayName])) {
          for (let i = 0; i < escalationPath[arrayName].length; i++) {
            const user = escalationPath[arrayName][i];

            // Check if name is missing or empty
            if (!user.name && user.user_id) {
              const fullName = await getUserName(user.user_id);
              if (fullName) {
                escalationPath[arrayName][i].name = fullName;
                needsUpdate = true;
              }
            }

            // Also check firstName/lastName format
            if (!user.name && (user.firstName || user.lastName)) {
              escalationPath[arrayName][i].name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
              needsUpdate = true;
            }
          }
        }
      }

      if (needsUpdate) {
        await client.query(
          `UPDATE eightd_reports SET escalation_path = $1 WHERE id = $2`,
          [JSON.stringify(escalationPath), report.id]
        );
        updatedCount++;
        console.log(`  Updated report #${report.id}`);
      } else {
        skippedCount++;
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Updated: ${updatedCount} reports`);
    console.log(`Skipped (already complete): ${skippedCount} reports`);

    // Verification sample
    if (updatedCount > 0) {
      const sample = await client.query(`
        SELECT id, escalation_path
        FROM eightd_reports
        WHERE escalation_path IS NOT NULL
        LIMIT 1
      `);

      if (sample.rows.length > 0) {
        console.log('\nSample verification (Report #' + sample.rows[0].id + '):');
        const ep = sample.rows[0].escalation_path;

        if (ep.issue_users?.length > 0) {
          console.log('  issue_users[0].name:', ep.issue_users[0].name);
        }
        if (ep.countermeasure_users?.length > 0) {
          console.log('  countermeasure_users[0].name:', ep.countermeasure_users[0].name);
        }
        if (ep.confirmation_users?.length > 0) {
          console.log('  confirmation_users[0].name:', ep.confirmation_users[0].name);
        }
      }
    }

  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate8DFrozenNames()
  .then(() => {
    console.log('\nMigration finished successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nMigration failed:', err.message);
    process.exit(1);
  });
