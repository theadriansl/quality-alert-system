const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'apqp_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function listAll() {
  const client = await pool.connect();
  try {
    // List all checklists
    const checklists = await client.query("SELECT id, name, (SELECT COUNT(*) FROM audit_checklist_items WHERE checklist_id = c.id) as items FROM audit_checklists c ORDER BY id");
    
    console.log('CHECKLISTS DISPONIBLES:');
    console.log('='.repeat(60));
    checklists.rows.forEach(c => {
      console.log('ID ' + c.id + ': ' + c.name + ' (' + c.items + ' items)');
    });
    
    // Now list items for each
    for (const checklist of checklists.rows) {
      const items = await client.query(
        "SELECT clause, question, category, is_critical FROM audit_checklist_items WHERE checklist_id = $1 ORDER BY item_order",
        [checklist.id]
      );
      
      console.log('\n' + '='.repeat(80));
      console.log('CHECKLIST: ' + checklist.name);
      console.log('='.repeat(80));
      
      let currentCategory = '';
      items.rows.forEach((item) => {
        if (item.category !== currentCategory) {
          currentCategory = item.category;
          console.log('\n--- ' + (currentCategory || 'GENERAL').toUpperCase() + ' ---');
        }
        const critical = item.is_critical ? ' [CRITICO]' : '';
        console.log(item.clause + '. ' + item.question + critical);
      });
    }
  } finally {
    client.release();
    await pool.end();
  }
}

listAll();
