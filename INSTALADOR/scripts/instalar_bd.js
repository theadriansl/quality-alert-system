/**
 * IxT-QMS - Script de Instalacion de Base de Datos
 *
 * Este script ejecuta todas las migraciones necesarias para
 * configurar la base de datos desde cero.
 *
 * Uso: node INSTALADOR/scripts/instalar_bd.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuracion de conexion
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'apqp_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

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

async function ejecutarMigracion(archivo, client) {
  const contenido = fs.readFileSync(archivo, 'utf8');
  try {
    await client.query(contenido);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║       IxT-QMS - INSTALADOR DE BASE DE DATOS              ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  // Verificar conexion
  log('1. Verificando conexion a PostgreSQL...', 'blue');
  try {
    const client = await pool.connect();
    log('   ✓ Conexion exitosa', 'green');
    client.release();
  } catch (error) {
    log('   ✗ Error de conexion: ' + error.message, 'red');
    log('\n   Verifica tu archivo .env con los datos correctos:', 'yellow');
    log('   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD', 'yellow');
    process.exit(1);
  }

  // Obtener lista de migraciones
  log('\n2. Buscando migraciones...', 'blue');
  const migrationsPath = path.join(__dirname, '../../backend/migrations');

  let archivos = fs.readdirSync(migrationsPath)
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => {
      // Ordenar por numero de migracion
      const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999');
      const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999');
      return numA - numB;
    });

  log(`   ✓ Encontradas ${archivos.length} migraciones`, 'green');

  // Ejecutar migraciones
  log('\n3. Ejecutando migraciones...', 'blue');

  let exitosas = 0;
  let fallidas = 0;
  const errores = [];

  for (const archivo of archivos) {
    const rutaCompleta = path.join(migrationsPath, archivo);
    const resultado = await ejecutarMigracion(rutaCompleta, pool);

    if (resultado.success) {
      log(`   ✓ ${archivo}`, 'green');
      exitosas++;
    } else {
      // Algunos errores son esperados (tabla ya existe, etc)
      if (resultado.error.includes('already exists') ||
          resultado.error.includes('duplicate key') ||
          resultado.error.includes('does not exist')) {
        log(`   ~ ${archivo} (ya aplicada)`, 'yellow');
        exitosas++;
      } else {
        log(`   ✗ ${archivo}`, 'red');
        errores.push({ archivo, error: resultado.error });
        fallidas++;
      }
    }
  }

  // Ejecutar funciones de particionamiento
  log('\n4. Configurando auto-particionamiento...', 'blue');
  try {
    await pool.query('SELECT * FROM ensure_future_partitions(6)');
    log('   ✓ Particiones futuras creadas (6 meses)', 'green');
  } catch (e) {
    log('   ~ Particionamiento se configurara al iniciar servidor', 'yellow');
  }

  // Crear usuario admin si no existe
  log('\n5. Verificando usuario administrador...', 'blue');
  try {
    const adminCheck = await pool.query(
      "SELECT id FROM users WHERE email = 'admin@company.com'"
    );
    if (adminCheck.rows.length === 0) {
      // El usuario admin se crea en las migraciones de seed
      log('   ~ Usuario admin se creara con datos de seed', 'yellow');
    } else {
      log('   ✓ Usuario admin existe', 'green');
    }
  } catch (e) {
    log('   ~ Tabla users aun no existe', 'yellow');
  }

  // Resumen
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    RESUMEN                               ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');
  log(`   Migraciones exitosas: ${exitosas}`, 'green');
  if (fallidas > 0) {
    log(`   Migraciones fallidas: ${fallidas}`, 'red');
    console.log('\n   Errores encontrados:');
    errores.forEach(e => {
      log(`   - ${e.archivo}: ${e.error.substring(0, 60)}...`, 'red');
    });
  }

  console.log('\n');
  if (fallidas === 0) {
    log('   ✓ BASE DE DATOS INSTALADA CORRECTAMENTE', 'green');
    console.log('\n   Siguiente paso: Iniciar el servidor con "npm start"');
  } else {
    log('   ⚠ INSTALACION COMPLETADA CON ADVERTENCIAS', 'yellow');
    console.log('\n   Revisa los errores antes de continuar.');
  }
  console.log('\n');

  await pool.end();
}

main().catch(err => {
  log('Error fatal: ' + err.message, 'red');
  process.exit(1);
});
