const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'apqp_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration(filePath) {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error('Archivo no encontrado:', absolutePath);
    process.exit(1);
  }

  const sql = fs.readFileSync(absolutePath, 'utf8');
  const client = await pool.connect();

  try {
    console.log('Ejecutando migración:', path.basename(filePath));
    console.log('='.repeat(50));

    await client.query(sql);

    console.log('Migración completada exitosamente.');
  } catch (error) {
    console.error('Error en migración:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Uso: node run-migration.js <archivo.sql>');
  process.exit(1);
}

runMigration(migrationFile);
