const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'apqp_system',
  password: 'postgres',
  port: 5432,
});

async function verifyUsers() {
  try {
    console.log('=== ESTRUCTURA DE TABLA USERS ===');
    const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    columns.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    console.log('\n=== TODOS LOS USUARIOS ===');
    const allUsers = await pool.query('SELECT * FROM users ORDER BY id');
    console.log(`Total usuarios: ${allUsers.rows.length}\n`);
    allUsers.rows.forEach(u => {
      console.log(`ID: ${u.id} | ${u.first_name} ${u.last_name} | ${u.email} | ${u.role} | ${u.position || 'N/A'}`);
    });

    console.log('\n=== QUALITY DIRECTOR ===');
    const qd = await pool.query("SELECT * FROM users WHERE role = 'Quality Director' OR position LIKE '%Quality Director%'");
    console.log(`Quality Directors encontrados: ${qd.rows.length}`);
    qd.rows.forEach(u => {
      console.log(`  ID: ${u.id} | ${u.first_name} ${u.last_name} | ${u.email} | Role: ${u.role} | Position: ${u.position}`);
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

verifyUsers();
