const { pool } = require('../config/database');

async function alterECRProductionColumnsToNumeric() {
  const client = await pool.connect();
  try {
    console.log('🔄 Converting ECR production columns TEXT → NUMERIC...');
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE ecr_reports
        ALTER COLUMN initial_scrap     TYPE NUMERIC(8,4) USING NULLIF(initial_scrap, '')::NUMERIC(8,4),
        ALTER COLUMN process_stability TYPE NUMERIC(8,4) USING NULLIF(process_stability, '')::NUMERIC(8,4),
        ALTER COLUMN cpk_post_change   TYPE NUMERIC(8,4) USING NULLIF(cpk_post_change, '')::NUMERIC(8,4)
    `);

    await client.query('COMMIT');
    console.log('✅ Columns converted: initial_scrap, process_stability, cpk_post_change → NUMERIC(8,4)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

alterECRProductionColumnsToNumeric()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
