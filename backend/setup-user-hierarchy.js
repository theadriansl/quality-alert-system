/**
 * Script to setup organizational hierarchy for users
 * Ejecutar con: node setup-user-hierarchy.js
 */

const { query, pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function setupHierarchy() {
  console.log('🚀 Configurando jerarquía organizacional...\n');

  try {
    // Execute migration
    console.log('📋 Ejecutando migración 004...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '004_add_hierarchy_fields.sql'),
      'utf8'
    );
    await query(migrationSQL);
    console.log('✅ Migración ejecutada\n');

    // Setup organizational hierarchy
    console.log('👥 Configurando jerarquía por departamento...\n');

    // ========================================================================
    // QUALITY MANAGEMENT DEPARTMENT
    // ========================================================================
    console.log('📊 Quality Management Department:');

    // Director (Level 0)
    const director = await query(`
      UPDATE users SET
        position = 'Quality Director',
        manager_id = NULL,
        hierarchy_level = 0,
        location = 'Headquarters - Office 300'
      WHERE email = 'admin@8dsystem.com'
      RETURNING id, first_name, last_name
    `);
    if (director.rows.length > 0) {
      console.log(`   ✓ Director: ${director.rows[0].first_name} ${director.rows[0].last_name} (Level 0)`);
    }

    // ========================================================================
    // QUALITY ENGINEERING DEPARTMENT
    // ========================================================================
    console.log('\n🔧 Quality Engineering Department:');

    // Manager (Level 1) - reports to Director
    const qeManager = await query(`
      UPDATE users SET
        position = 'Quality Engineering Manager',
        manager_id = (SELECT id FROM users WHERE email = 'admin@8dsystem.com'),
        hierarchy_level = 1,
        location = 'Plant North - Office 201'
      WHERE email = 'manager@8dsystem.com'
      RETURNING id, first_name, last_name
    `);
    if (qeManager.rows.length > 0) {
      console.log(`   ✓ Manager: ${qeManager.rows[0].first_name} ${qeManager.rows[0].last_name} (Level 1 - Reports to Director)`);
    }

    // Engineers (Level 3) - report to Manager
    const qeEngineers = await query(`
      UPDATE users SET
        position = 'Quality Engineer',
        manager_id = (SELECT id FROM users WHERE email = 'manager@8dsystem.com'),
        hierarchy_level = 3,
        location = 'Plant North - Lab B'
      WHERE email IN ('engineer@8dsystem.com', 'maria.engineer@company.com')
      RETURNING id, first_name, last_name
    `);
    qeEngineers.rows.forEach(eng => {
      console.log(`   ✓ Engineer: ${eng.first_name} ${eng.last_name} (Level 3 - Reports to QE Manager)`);
    });

    // Analyst (Level 3) - reports to Manager
    const analyst = await query(`
      UPDATE users SET
        position = 'Quality Analyst',
        manager_id = (SELECT id FROM users WHERE email = 'manager@8dsystem.com'),
        hierarchy_level = 3,
        location = 'Plant North - Lab C'
      WHERE email IN ('analyst@8dsystem.com', 'sarah.analyst@company.com')
      RETURNING id, first_name, last_name
    `);
    analyst.rows.forEach(a => {
      console.log(`   ✓ Analyst: ${a.first_name} ${a.last_name} (Level 3 - Reports to QE Manager)`);
    });

    // ========================================================================
    // QUALITY ASSURANCE DEPARTMENT
    // ========================================================================
    console.log('\n✅ Quality Assurance Department:');

    // Manager (Level 1) - reports to Director
    const qaManager = await query(`
      UPDATE users SET
        position = 'Quality Assurance Manager',
        manager_id = (SELECT id FROM users WHERE email = 'admin@8dsystem.com'),
        hierarchy_level = 1,
        location = 'Plant South - Office 150'
      WHERE email = 'john.quality@company.com'
      RETURNING id, first_name, last_name
    `);
    if (qaManager.rows.length > 0) {
      console.log(`   ✓ Manager: ${qaManager.rows[0].first_name} ${qaManager.rows[0].last_name} (Level 1 - Reports to Director)`);
    }

    // ========================================================================
    // QUALITY CONTROL DEPARTMENT
    // ========================================================================
    console.log('\n🔍 Quality Control Department:');

    // Technician (Level 4) - reports to QE Manager (cross-department)
    const technician = await query(`
      UPDATE users SET
        position = 'Quality Control Technician',
        manager_id = (SELECT id FROM users WHERE email = 'manager@8dsystem.com'),
        hierarchy_level = 4,
        location = 'Plant South - Line 1'
      WHERE email = 'technician@8dsystem.com'
      RETURNING id, first_name, last_name
    `);
    if (technician.rows.length > 0) {
      console.log(`   ✓ Technician: ${technician.rows[0].first_name} ${technician.rows[0].last_name} (Level 4 - Reports to QE Manager)`);
    }

    // ========================================================================
    // PRODUCTION DEPARTMENT
    // ========================================================================
    console.log('\n🏭 Production Department:');

    // Supervisor (Level 2) - reports to Director
    const supervisor = await query(`
      UPDATE users SET
        position = 'Production Supervisor',
        manager_id = (SELECT id FROM users WHERE email = 'admin@8dsystem.com'),
        hierarchy_level = 2,
        location = 'Plant North - Production Floor'
      WHERE email IN ('supervisor@8dsystem.com', 'david.supervisor@company.com')
      RETURNING id, first_name, last_name
    `);
    supervisor.rows.forEach(sup => {
      console.log(`   ✓ Supervisor: ${sup.first_name} ${sup.last_name} (Level 2 - Reports to Director)`);
    });

    // ========================================================================
    // LABORATORY DEPARTMENT
    // ========================================================================
    console.log('\n🔬 Laboratory Department:');

    // Lab Technician (Level 4) - reports to QE Manager
    const labTech = await query(`
      UPDATE users SET
        position = 'Laboratory Technician',
        manager_id = (SELECT id FROM users WHERE email = 'manager@8dsystem.com'),
        hierarchy_level = 4,
        location = 'Central Lab - Section A'
      WHERE email = 'michael.tech@company.com'
      RETURNING id, first_name, last_name
    `);
    if (labTech.rows.length > 0) {
      console.log(`   ✓ Lab Technician: ${labTech.rows[0].first_name} ${labTech.rows[0].last_name} (Level 4 - Reports to QE Manager)`);
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n📊 RESUMEN DE JERARQUÍA:');
    console.log('=====================================');

    const hierarchy = await query(`
      SELECT
        u.hierarchy_level,
        CASE u.hierarchy_level
          WHEN 0 THEN 'Director'
          WHEN 1 THEN 'Manager'
          WHEN 2 THEN 'Supervisor'
          WHEN 3 THEN 'Engineer/Analyst'
          WHEN 4 THEN 'Technician'
        END as level_name,
        COUNT(*) as count,
        STRING_AGG(u.first_name || ' ' || u.last_name, ', ' ORDER BY u.last_name) as users
      FROM users u
      GROUP BY u.hierarchy_level
      ORDER BY u.hierarchy_level
    `);

    hierarchy.rows.forEach(row => {
      console.log(`\nNivel ${row.hierarchy_level} (${row.level_name}): ${row.count} usuarios`);
      console.log(`   ${row.users}`);
    });

    console.log('\n=====================================');

    // Show reporting structure
    console.log('\n📋 ESTRUCTURA DE REPORTES:');
    console.log('=====================================');

    const reportingStructure = await query(`
      SELECT
        e.id,
        e.first_name || ' ' || e.last_name as employee,
        e.position,
        e.department,
        e.hierarchy_level,
        COALESCE(m.first_name || ' ' || m.last_name, 'N/A') as manager,
        COALESCE(m.position, 'N/A') as manager_position
      FROM users e
      LEFT JOIN users m ON e.manager_id = m.id
      ORDER BY e.hierarchy_level, e.department, e.last_name
    `);

    reportingStructure.rows.forEach(row => {
      console.log(`\n${row.employee} (${row.position})`);
      console.log(`   Departamento: ${row.department}`);
      console.log(`   Nivel: ${row.hierarchy_level}`);
      console.log(`   Reporta a: ${row.manager} (${row.manager_position})`);
    });

    console.log('\n=====================================');
    console.log('🎉 ¡Jerarquía organizacional configurada exitosamente!\n');

  } catch (error) {
    console.error('❌ Error configurando jerarquía:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Ejecutar
setupHierarchy();
