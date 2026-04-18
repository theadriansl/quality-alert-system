const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'apqp_system',
  password: 'postgres',
  port: 5432,
});

async function analyzeUsers() {
  try {
    // Primero ver la estructura de la tabla
    console.log('=== ESTRUCTURA DE TABLA USERS ===');
    const columns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    columns.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    // Ver todos los usuarios
    console.log('\n=== TODOS LOS USUARIOS EN LA BASE DE DATOS ===');
    const allUsers = await pool.query('SELECT * FROM users ORDER BY id');
    console.log(`Total de usuarios: ${allUsers.rows.length}\n`);
    allUsers.rows.forEach(u => {
      console.log('---');
      console.log(JSON.stringify(u, null, 2));
    });

    // Verificar Quality Directors
    console.log('\n=== VERIFICANDO QUALITY DIRECTOR ===');
    const qd = await pool.query("SELECT * FROM users WHERE position = 'Quality Director' OR role = 'Quality Director'");
    console.log(`Quality Directors encontrados: ${qd.rows.length}`);
    if (qd.rows.length > 0) {
      qd.rows.forEach(u => {
        console.log('\nQuality Director encontrado:');
        console.log(JSON.stringify(u, null, 2));
      });
    }

    // Verificar el usuario admin@8dsystem.com específicamente
    console.log('\n=== VERIFICANDO admin@8dsystem.com ===');
    const admin = await pool.query("SELECT * FROM users WHERE email = 'admin@8dsystem.com'");
    if (admin.rows.length > 0) {
      console.log('Usuario encontrado:');
      console.log(JSON.stringify(admin.rows[0], null, 2));
    } else {
      console.log('❌ No se encontró el usuario admin@8dsystem.com');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeUsers();
