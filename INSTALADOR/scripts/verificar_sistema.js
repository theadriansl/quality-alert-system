/**
 * IxT-QMS - Script de Verificacion del Sistema
 *
 * Verifica que todos los componentes esten correctamente instalados
 * y funcionando.
 *
 * Uso: node INSTALADOR/scripts/verificar_sistema.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function verificar(nombre, comando, versionMinima = null) {
  try {
    const resultado = execSync(comando, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const version = resultado.trim().split('\n')[0];
    log(`   ✓ ${nombre}: ${version}`, 'green');
    return true;
  } catch (error) {
    log(`   ✗ ${nombre}: NO INSTALADO`, 'red');
    return false;
  }
}

function verificarArchivo(ruta, descripcion) {
  const rutaCompleta = path.join(__dirname, '../..', ruta);
  if (fs.existsSync(rutaCompleta)) {
    log(`   ✓ ${descripcion}`, 'green');
    return true;
  } else {
    log(`   ✗ ${descripcion} (falta: ${ruta})`, 'red');
    return false;
  }
}

async function verificarPostgreSQL() {
  try {
    require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'apqp_system',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      connectionTimeoutMillis: 5000
    });

    const client = await pool.connect();
    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version.split(' ').slice(0, 2).join(' ');

    // Verificar tablas principales
    const tablasResult = await client.query(`
      SELECT COUNT(*) as cnt FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const numTablas = tablasResult.rows[0].cnt;

    client.release();
    await pool.end();

    log(`   ✓ PostgreSQL: ${version}`, 'green');
    log(`   ✓ Base de datos: ${numTablas} tablas encontradas`, 'green');
    return true;
  } catch (error) {
    log(`   ✗ PostgreSQL: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║       IxT-QMS - VERIFICACION DEL SISTEMA                 ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  let todoCorrecto = true;

  // 1. Verificar Node.js
  log('1. Verificando Node.js...', 'blue');
  if (!verificar('Node.js', 'node --version')) todoCorrecto = false;
  if (!verificar('npm', 'npm --version')) todoCorrecto = false;

  // 2. Verificar PostgreSQL
  log('\n2. Verificando PostgreSQL...', 'blue');
  if (!await verificarPostgreSQL()) todoCorrecto = false;

  // 3. Verificar archivos de configuracion
  log('\n3. Verificando archivos de configuracion...', 'blue');
  if (!verificarArchivo('backend/.env', 'Backend .env')) todoCorrecto = false;
  if (!verificarArchivo('backend/package.json', 'Backend package.json')) todoCorrecto = false;
  if (!verificarArchivo('frontend/package.json', 'Frontend package.json')) todoCorrecto = false;

  // 4. Verificar dependencias instaladas
  log('\n4. Verificando dependencias...', 'blue');
  if (!verificarArchivo('backend/node_modules', 'Backend node_modules')) {
    log('     Ejecutar: cd backend && npm install', 'yellow');
    todoCorrecto = false;
  }
  if (!verificarArchivo('frontend/node_modules', 'Frontend node_modules')) {
    log('     Ejecutar: cd frontend && npm install', 'yellow');
    todoCorrecto = false;
  }

  // 5. Verificar carpetas de uploads
  log('\n5. Verificando carpetas de archivos...', 'blue');
  const carpetasUploads = [
    'backend/uploads',
    'backend/uploads/defect-attachments',
    'backend/uploads/qar',
    'backend/uploads/mrb'
  ];
  carpetasUploads.forEach(carpeta => {
    verificarArchivo(carpeta, carpeta);
  });

  // Resumen
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    RESULTADO                             ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');

  if (todoCorrecto) {
    log('   ✓ SISTEMA LISTO PARA EJECUTAR', 'green');
    console.log('\n   Para iniciar:');
    console.log('   1. Terminal 1: cd backend && npm start');
    console.log('   2. Terminal 2: cd frontend && npm start');
  } else {
    log('   ⚠ HAY PROBLEMAS QUE RESOLVER', 'yellow');
    console.log('\n   Revisa los mensajes anteriores y corrige los errores.');
  }
  console.log('\n');
}

main().catch(err => {
  log('Error: ' + err.message, 'red');
});
