const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  database: 'apqp_system',
  user: 'postgres',
  password: 'postgres'
});

async function fixEscalationPaths() {
  try {
    // Get all users
    const usersResult = await pool.query('SELECT id, first_name, last_name, role, department, email FROM users WHERE is_active = true');
    const users = usersResult.rows.map(u => ({
      id: u.id,
      name: u.first_name + ' ' + u.last_name,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role,
      department: u.department,
      email: u.email
    }));
    console.log('Active users loaded:', users.length);

    // Get all reports
    const reports = await pool.query('SELECT id, issue_assigned_to, countermeasure_assigned_to, confirmation_assigned_to FROM eightd_reports');
    console.log('Reports to update:', reports.rows.length);

    let updated = 0;
    for (const report of reports.rows) {
      // Create escalation path with 3 users for each category
      const shuffledUsers = [...users].sort(() => Math.random() - 0.5);

      // Issue users (first 3)
      const issueUsers = shuffledUsers.slice(0, 3).map((u, idx) => ({
        user_id: u.id,
        name: u.name,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        department: u.department,
        email: u.email,
        order: idx + 1,
        is_primary: idx === 0
      }));

      // Countermeasure users (next 3)
      const countermeasureUsers = shuffledUsers.slice(3, 6).map((u, idx) => ({
        user_id: u.id,
        name: u.name,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        department: u.department,
        email: u.email,
        order: idx + 1,
        is_primary: idx === 0
      }));

      // Confirmation users (next 3)
      const confirmationUsers = shuffledUsers.slice(6, 9).map((u, idx) => ({
        user_id: u.id,
        name: u.name,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        department: u.department,
        email: u.email,
        order: idx + 1,
        is_primary: idx === 0
      }));

      const escalationPath = {
        issue_users: issueUsers,
        countermeasure_users: countermeasureUsers,
        confirmation_users: confirmationUsers,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await pool.query(
        'UPDATE eightd_reports SET escalation_path = $1 WHERE id = $2',
        [JSON.stringify(escalationPath), report.id]
      );
      updated++;
    }

    console.log('Updated:', updated, 'reports with escalation paths');

    // Verify
    const verify = await pool.query('SELECT id, escalation_path FROM eightd_reports WHERE id = 33');
    console.log('\nReport 33 escalation_path:');
    console.log(JSON.stringify(verify.rows[0].escalation_path, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

fixEscalationPaths();
