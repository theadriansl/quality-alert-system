const { pool } = require('../config/database');

async function createTeamTemplatesTable() {
  const client = await pool.connect();

  try {
    console.log('🔄 Creating team_templates table...');

    await client.query('BEGIN');

    // Create team_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        review_board JSONB DEFAULT '{"primary": null, "members": []}'::jsonb,
        validation_teams JSONB DEFAULT '{}'::jsonb,
        involved_areas JSONB DEFAULT '[]'::jsonb,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_team_templates_created_by
      ON team_templates (created_by);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_team_templates_name
      ON team_templates (name);
    `);

    // Add comments
    await client.query(`
      COMMENT ON TABLE team_templates IS
      'Plantillas de equipos pre-configurados para reutilizar en múltiples ECRs';
    `);

    await client.query(`
      COMMENT ON COLUMN team_templates.review_board IS
      'Configuración de Review Board (primary y members)';
    `);

    await client.query(`
      COMMENT ON COLUMN team_templates.validation_teams IS
      'Configuración de Validation Teams por área';
    `);

    await client.query('COMMIT');

    console.log('✅ team_templates table created successfully');
    console.log('');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating team_templates table:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if called directly
if (require.main === module) {
  createTeamTemplatesTable()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createTeamTemplatesTable };
