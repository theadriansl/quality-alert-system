const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: 5432,
  database: 'apqp_system',
  user: 'postgres',
  password: 'postgres'
});

async function updateTeamMembers() {
  try {
    // Get all users
    const usersResult = await pool.query('SELECT id, first_name, last_name, role, department, email FROM users');
    const users = {};
    usersResult.rows.forEach(u => {
      users[u.id] = {
        name: u.first_name + ' ' + u.last_name,
        firstName: u.first_name,
        lastName: u.last_name,
        role: u.role,
        department: u.department,
        email: u.email
      };
    });
    console.log('Users loaded:', Object.keys(users).length);

    // Get all reports
    const reports = await pool.query('SELECT id, d1_team_members, d1_champion_id, created_by, issue_assigned_to, countermeasure_assigned_to, confirmation_assigned_to FROM eightd_reports');
    console.log('Reports to update:', reports.rows.length);

    let updated = 0;
    for (const report of reports.rows) {
      if (report.d1_team_members && Array.isArray(report.d1_team_members)) {
        // Update team members with full user info
        const updatedMembers = report.d1_team_members.map(member => {
          const user = users[member.userId];
          return {
            userId: member.userId,
            role: member.role,
            assignedAt: member.assignedAt,
            userName: user ? user.name : 'Unknown User',
            firstName: user ? user.firstName : '',
            lastName: user ? user.lastName : '',
            userPosition: user ? user.role : '',
            department: user ? user.department : '',
            email: user ? user.email : ''
          };
        });

        await pool.query(
          'UPDATE eightd_reports SET d1_team_members = $1 WHERE id = $2',
          [JSON.stringify(updatedMembers), report.id]
        );
        updated++;
      }
    }

    console.log('Updated:', updated, 'reports with user names');

    // Verify one record
    const verify = await pool.query('SELECT d1_team_members FROM eightd_reports LIMIT 1');
    console.log('\nSample updated team members:');
    console.log(JSON.stringify(verify.rows[0].d1_team_members, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

updateTeamMembers();
