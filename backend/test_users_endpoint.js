const { query } = require('./config/database');
const { transformToCamelCase } = require('./utils/caseTransform');

async function testUsersEndpoint() {
  try {
    console.log('=== PROBANDO ENDPOINT /users/list ===\n');

    const result = await query(`
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.role, u.position,
        u.department, u.phone, u.extension, u.location,
        u.is_tft_member, u.permissions, u.hierarchy_level, u.manager_id,
        m.first_name as manager_first_name,
        m.last_name as manager_last_name,
        m.position as manager_position
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      ORDER BY u.hierarchy_level, u.last_name, u.first_name
    `);

    console.log(`Total de usuarios retornados: ${result.rows.length}\n`);

    const users = result.rows.map(row => {
      const user = transformToCamelCase(row);
      // Add manager info if exists
      if (row.manager_first_name) {
        user.manager = {
          id: user.managerId,
          firstName: row.manager_first_name,
          lastName: row.manager_last_name,
          position: row.manager_position,
          name: `${row.manager_first_name} ${row.manager_last_name}`
        };
      }
      return user;
    });

    console.log('=== USUARIOS TRANSFORMADOS (camelCase) ===\n');
    users.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Position: ${user.position}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Department: ${user.department}`);
      console.log(`   Hierarchy Level: ${user.hierarchyLevel}`);
      if (user.manager) {
        console.log(`   Manager: ${user.manager.name} (${user.manager.position})`);
      }
      console.log('');
    });

    console.log('\n=== VERIFICANDO admin@8dsystem.com ===');
    const adminUser = users.find(u => u.email === 'admin@8dsystem.com');
    if (adminUser) {
      console.log('✅ Usuario admin@8dsystem.com ESTÁ en la lista');
      console.log('Datos completos:');
      console.log(JSON.stringify(adminUser, null, 2));
    } else {
      console.log('❌ Usuario admin@8dsystem.com NO está en la lista');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testUsersEndpoint();
