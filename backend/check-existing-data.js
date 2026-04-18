const { query } = require('./config/database');

async function checkData() {
  try {
    console.log('\n=== CHECKING EXISTING DATA ===\n');

    // Check projects
    const projectsResult = await query('SELECT id, project_number, project_name, client_name FROM projects ORDER BY id');
    console.log(`📁 PROJECTS (${projectsResult.rows.length} total):`);
    projectsResult.rows.forEach(p => {
      console.log(`  ${p.id}. ${p.project_number} - ${p.project_name}`);
      console.log(`     Client: ${p.client_name}`);
    });

    // Check parts
    const partsResult = await query('SELECT COUNT(*) as count FROM project_parts');
    console.log(`\n🔩 PARTS: ${partsResult.rows[0].count} total`);

    // Check contacts
    const contactsResult = await query('SELECT COUNT(*) as count FROM client_contacts');
    console.log(`👥 CONTACTS: ${contactsResult.rows[0].count} total`);

    // Check clients
    const clientsResult = await query('SELECT id, name, alias FROM clients ORDER BY id');
    console.log(`\n🏢 CLIENTS (${clientsResult.rows.length} total):`);
    clientsResult.rows.forEach(c => {
      console.log(`  ${c.id}. ${c.name} (${c.alias})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkData();
