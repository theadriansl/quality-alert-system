// Migrate existing project_parts to client_parts (BOM)
const { query } = require('./config/database');

async function migrateProjectPartsToBOM() {
  try {
    console.log('🔄 Migrating project parts to client BOMs...\n');

    // Get all unique parts from projects (grouped by client_id and part_number)
    const result = await query(`
      SELECT DISTINCT ON (p.client_id, pp.part_number)
        p.client_id,
        pp.part_number,
        pp.client_part_number,
        pp.part_name,
        pp.description,
        pp.revision,
        pp.specifications,
        pp.weight,
        pp.snp_quantity,
        pp.snp_volume,
        pp.unit_cost,
        pp.currency,
        c.name as client_name
      FROM project_parts pp
      JOIN projects p ON pp.project_id = p.id
      JOIN clients c ON p.client_id = c.id
      ORDER BY p.client_id, pp.part_number, pp.created_at DESC
    `);

    console.log(`📦 Found ${result.rows.length} unique parts to migrate\n`);

    let inserted = 0;
    let skipped = 0;

    for (const part of result.rows) {
      try {
        // Check if part already exists in client_parts
        const existingPart = await query(
          'SELECT id FROM client_parts WHERE client_id = $1 AND part_number = $2',
          [part.client_id, part.part_number]
        );

        if (existingPart.rows.length > 0) {
          console.log(`⏭️  Skipped: ${part.part_number} (${part.client_name}) - already exists in BOM`);
          skipped++;
          continue;
        }

        // Parse specifications JSON if it exists
        let customFields = {};
        if (part.specifications) {
          try {
            const specs = typeof part.specifications === 'string'
              ? JSON.parse(part.specifications)
              : part.specifications;

            // Convert specifications to custom fields format
            if (typeof specs === 'object' && specs !== null) {
              customFields = specs;
            }
          } catch (e) {
            // If not valid JSON, store as text
            customFields = { 'Specifications': part.specifications };
          }
        }

        // Insert into client_parts
        const insertResult = await query(
          `INSERT INTO client_parts (
            client_id, part_number, client_part_number, part_name,
            description, revision, specifications, weight,
            snp_quantity, snp_volume, unit_cost, currency, active, custom_fields
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id, part_number`,
          [
            part.client_id,
            part.part_number,
            part.client_part_number,
            part.part_name,
            part.description,
            part.revision,
            part.specifications,
            part.weight,
            part.snp_quantity,
            part.snp_volume,
            part.unit_cost,
            part.currency,
            true, // All migrated parts are active by default
            JSON.stringify(customFields)
          ]
        );

        console.log(`✅ Migrated: ${insertResult.rows[0].part_number} → ${part.client_name} (ID: ${insertResult.rows[0].id})`);
        inserted++;

      } catch (err) {
        console.error(`❌ Error migrating ${part.part_number}:`, err.message);
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Inserted: ${inserted}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📦 Total processed: ${result.rows.length}`);

    // Show final counts
    const finalStats = await query(`
      SELECT
        c.name as client_name,
        COUNT(cp.id) as parts_count
      FROM clients c
      LEFT JOIN client_parts cp ON c.id = cp.client_id
      GROUP BY c.id, c.name
      ORDER BY c.name
    `);

    console.log(`\n📋 Parts per client BOM:`);
    finalStats.rows.forEach(row => {
      console.log(`   ${row.client_name}: ${row.parts_count} parts`);
    });

    console.log('\n✅ Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateProjectPartsToBOM();
