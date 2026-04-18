const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedData() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting data migration to PostgreSQL...\n');
    await client.query('BEGIN');

    // ========================================================================
    // 1. MIGRATE USERS
    // ========================================================================
    console.log('👥 Migrating users...');

    const users = [
      {
        email: 'admin@8dsystem.com',
        password: 'password123',
        first_name: 'Quality',
        last_name: 'Director',
        role: 'Champion',
        department: 'Quality Management',
        phone: '+52-442-123-4567',
        is_tft_member: false,
        permissions: JSON.stringify([
          'view_all_8d', 'approve_costly_actions', 'manage_users',
          'view_executive_reports', 'escalate_to_customer', 'override_decisions',
          'close_8d_reports', 'assign_teams'
        ])
      },
      {
        email: 'manager@8dsystem.com',
        password: 'password123',
        first_name: 'Quality',
        last_name: 'Manager',
        role: 'Manager',
        department: 'Quality Engineering',
        phone: '+52-442-234-5678',
        is_tft_member: true,
        permissions: JSON.stringify([
          'view_team_8d', 'assign_team_members', 'approve_actions',
          'coordinate_8d_meetings', 'manage_team_8d', 'escalate_to_director',
          'validate_implementations'
        ])
      },
      {
        email: 'engineer@8dsystem.com',
        password: 'password123',
        first_name: 'Quality',
        last_name: 'Engineer',
        role: 'Engineer',
        department: 'Product Engineering',
        phone: '+52-442-345-6789',
        is_tft_member: true,
        permissions: JSON.stringify([
          'lead_8d_investigation', 'perform_root_cause', 'design_corrective_actions',
          'validate_effectiveness', 'update_8d_status', 'collaborate_with_team',
          'escalate_to_manager'
        ])
      },
      {
        email: 'technician@8dsystem.com',
        password: 'password123',
        first_name: 'Quality',
        last_name: 'Technician',
        role: 'Technician',
        department: 'Quality Control',
        phone: '+52-442-456-7890',
        is_tft_member: true,
        permissions: JSON.stringify([
          'collect_data', 'implement_containment', 'document_evidence',
          'report_findings', 'execute_actions', 'request_support'
        ])
      },
      {
        email: 'supervisor@8dsystem.com',
        password: 'password123',
        first_name: 'Production',
        last_name: 'Supervisor',
        role: 'Supervisor',
        department: 'Production',
        phone: '+52-442-567-8901',
        is_tft_member: false,
        permissions: JSON.stringify([
          'supervise_production', 'implement_containment', 'coordinate_teams',
          'escalate_issues', 'approve_process_changes'
        ])
      },
      {
        email: 'analyst@8dsystem.com',
        password: 'password123',
        first_name: 'Quality',
        last_name: 'Analyst',
        role: 'Analyst',
        department: 'Quality Engineering',
        phone: '+52-442-678-9012',
        is_tft_member: true,
        permissions: JSON.stringify([
          'analyze_data', 'perform_investigations', 'create_reports',
          'validate_findings', 'support_root_cause'
        ])
      }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);

      await client.query(`
        INSERT INTO users (
          email, password, first_name, last_name, role, department,
          phone, is_tft_member, permissions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (email) DO UPDATE SET
          password = EXCLUDED.password,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          role = EXCLUDED.role,
          department = EXCLUDED.department,
          phone = EXCLUDED.phone,
          is_tft_member = EXCLUDED.is_tft_member,
          permissions = EXCLUDED.permissions
      `, [
        user.email,
        hashedPassword,
        user.first_name,
        user.last_name,
        user.role,
        user.department,
        user.phone,
        user.is_tft_member,
        user.permissions
      ]);
    }

    console.log(`✅ Migrated ${users.length} users\n`);

    // ========================================================================
    // 2. MIGRATE CLIENTS
    // ========================================================================
    console.log('🏢 Migrating clients...');

    const clients = [
      {
        name: 'Faurecia Sistemas Automotrices SA de CV',
        alias: 'FAUMX',
        vendor_number: 'AN01274677429',
        corporate_address: '4006 S 23rd Street, Phoenix, AZ',
        corporate_phone: '+1 (937) 492-2708',
        corporate_fax: '(000) 000-0000 ext',
        billing_address: '(FAUMX) Faurecia Sistemas Automotrices SA de CV',
        billing_frequency: 'Weekly',
        billing_period: 'Monday to Sunday',
        website: 'http://www.faurecia.com',
        is_active: true,
        requires_signature: false,
        contacts: [
          { name: 'Juan Perez', title: 'Quality Manager', email: 'juan.perez@faurecia.com', phone: '+52-442-123-4567' },
          { name: 'Maria Rodriguez', title: 'Plant Manager', email: 'maria.rodriguez@faurecia.com', phone: '+52-442-234-5678' }
        ]
      },
      {
        name: 'Gissing North America LLC',
        alias: 'GISSNA',
        vendor_number: '',
        corporate_address: '1234 Industrial Blvd, Detroit, MI',
        corporate_phone: '+1 (313) 555-0100',
        corporate_fax: '',
        billing_address: '(GISSNA) Gissing North America LLC',
        billing_frequency: 'Weekly',
        billing_period: 'Monday to Sunday',
        website: 'http://www.gissing.com',
        is_active: true,
        requires_signature: true,
        contacts: [
          { name: 'John Smith', title: 'Quality Director', email: 'john.smith@gissing.com', phone: '+1-313-555-0101' }
        ]
      },
      {
        name: 'Lucid Headquarters',
        alias: 'LCDHQ',
        vendor_number: '110581',
        corporate_address: '7373 Gateway Blvd, Newark, CA 94560',
        corporate_phone: '+1 (510) 648-3553',
        corporate_fax: '',
        billing_address: 'Lucid Headquarters',
        billing_frequency: 'Bi-weekly',
        billing_period: 'Monday to Sunday',
        website: 'http://www.lucidmotors.com',
        is_active: true,
        requires_signature: true,
        contacts: [
          { name: 'Sarah Johnson', title: 'VP of Quality', email: 'sarah.johnson@lucidmotors.com', phone: '+1-510-648-3560' },
          { name: 'Michael Chen', title: 'Quality Engineer', email: 'michael.chen@lucidmotors.com', phone: '+1-510-648-3561' }
        ]
      },
      {
        name: 'ElringKlinger Canada Inc',
        alias: 'ELRKLION',
        vendor_number: '',
        corporate_address: '123 Auto Parts Way, Windsor, ON',
        corporate_phone: '+1 (519) 255-1234',
        corporate_fax: '',
        billing_address: 'ElringKlinger Canada Inc',
        billing_frequency: 'Monthly',
        billing_period: 'First to Last day of month',
        website: 'http://www.elringklinger.ca',
        is_active: true,
        requires_signature: false,
        contacts: [
          { name: 'David Brown', title: 'Operations Manager', email: 'david.brown@elringklinger.ca', phone: '+1-519-255-1235' }
        ]
      },
      {
        name: 'Mubea de México S de RL de CV',
        alias: 'MUBEACL',
        vendor_number: '',
        corporate_address: 'Parque Industrial Queretaro, QRO',
        corporate_phone: '+52-442-345-6789',
        corporate_fax: '',
        billing_address: 'Mubea de México S de RL de CV',
        billing_frequency: 'Weekly',
        billing_period: 'Monday to Sunday',
        website: 'http://www.mubea.com',
        is_active: true,
        requires_signature: false,
        contacts: [
          { name: 'Carlos Martinez', title: 'Plant Manager', email: 'carlos.martinez@mubea.com', phone: '+52-442-345-6790' }
        ]
      }
    ];

    let clientIdCounter = 1;
    const clientIdMap = {};

    for (const clientData of clients) {
      const { contacts, ...clientInfo } = clientData;

      const clientResult = await client.query(`
        INSERT INTO clients (
          name, alias, vendor_number, corporate_address, corporate_phone,
          corporate_fax, billing_address, billing_frequency, billing_period,
          website, is_active, requires_signature
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        clientInfo.name,
        clientInfo.alias,
        clientInfo.vendor_number,
        clientInfo.corporate_address,
        clientInfo.corporate_phone,
        clientInfo.corporate_fax,
        clientInfo.billing_address,
        clientInfo.billing_frequency,
        clientInfo.billing_period,
        clientInfo.website,
        clientInfo.is_active,
        clientInfo.requires_signature
      ]);

      const clientId = clientResult.rows[0].id;
      clientIdMap[clientInfo.alias] = clientId;

      // Insert contacts
      for (const contact of contacts) {
        await client.query(`
          INSERT INTO client_contacts (client_id, name, title, email, phone)
          VALUES ($1, $2, $3, $4, $5)
        `, [clientId, contact.name, contact.title, contact.email, contact.phone]);
      }

      clientIdCounter++;
    }

    console.log(`✅ Migrated ${clients.length} clients with contacts\n`);

    // ========================================================================
    // 3. MIGRATE PROJECTS AND PARTS
    // ========================================================================
    console.log('📁 Migrating projects and parts...');

    const projects = [
      {
        project_number: 'PROJ-2024-001',
        project_name: 'Instrument Panel Assembly Program',
        client_alias: 'FAUMX',
        description: 'Complete instrument panel assembly for automotive interior',
        status: 'Active',
        start_date: '2024-01-15',
        target_end_date: '2025-12-31',
        parts: [
          {
            part_number: 'FAU-IP-2024-001',
            client_part_number: 'CLI-FAU-001',
            part_name: 'Instrument Panel Main Assembly',
            description: 'Main instrument panel structure',
            revision: 'Rev C',
            specifications: 'PPAP Level 3 required',
            weight: 2.5,
            snp_quantity: 100,
            snp_volume: 0.05,
            unit_cost: 45.50,
            currency: 'USD'
          },
          {
            part_number: 'FAU-IP-2024-002',
            client_part_number: 'CLI-FAU-002',
            part_name: 'Center Console Trim',
            description: 'Center console decorative trim piece',
            revision: 'Rev A',
            specifications: 'Surface finish critical',
            weight: 0.8,
            snp_quantity: 200,
            snp_volume: 0.02,
            unit_cost: 12.75,
            currency: 'USD'
          },
          {
            part_number: 'FAU-IP-2024-003',
            client_part_number: 'CLI-FAU-003',
            part_name: 'Glove Box Door',
            description: 'Glove box door with latch mechanism',
            revision: 'Rev B',
            specifications: 'Latch torque 5-7 Nm',
            weight: 1.2,
            snp_quantity: 150,
            snp_volume: 0.03,
            unit_cost: 23.80,
            currency: 'USD'
          }
        ]
      },
      {
        project_number: 'PROJ-2024-002',
        project_name: 'Electric Vehicle Chassis Components',
        client_alias: 'LCDHQ',
        description: 'Chassis structural components for EV platform',
        status: 'Active',
        start_date: '2024-06-20',
        target_end_date: '2026-06-30',
        parts: [
          {
            part_number: 'LUC-CH-2024-001',
            client_part_number: 'CLI-LUC-001',
            part_name: 'Front Subframe Assembly',
            description: 'Aluminum front subframe for EV',
            revision: 'Rev D',
            specifications: 'Crash test validated, PPAP Level 5',
            weight: 15.5,
            snp_quantity: 50,
            snp_volume: 0.35,
            unit_cost: 285.00,
            currency: 'USD'
          },
          {
            part_number: 'LUC-CH-2024-002',
            client_part_number: 'CLI-LUC-002',
            part_name: 'Battery Mounting Bracket',
            description: 'Structural bracket for battery pack mounting',
            revision: 'Rev C',
            specifications: 'Torque spec 180 Nm, Grade 10.9 bolts',
            weight: 8.3,
            snp_quantity: 75,
            snp_volume: 0.18,
            unit_cost: 156.50,
            currency: 'USD'
          }
        ]
      }
    ];

    for (const projectData of projects) {
      const { parts, client_alias, ...project } = projectData;
      const clientId = clientIdMap[client_alias];

      const projectResult = await client.query(`
        INSERT INTO projects (
          project_number, project_name, client_id, client_name,
          description, status, start_date, target_end_date
        ) VALUES ($1, $2, $3, (SELECT name FROM clients WHERE id = $3), $4, $5, $6, $7)
        RETURNING id
      `, [
        project.project_number,
        project.project_name,
        clientId,
        project.description,
        project.status,
        project.start_date,
        project.target_end_date
      ]);

      const projectId = projectResult.rows[0].id;

      // Insert parts
      for (const part of parts) {
        await client.query(`
          INSERT INTO project_parts (
            project_id, part_number, client_part_number, part_name,
            description, revision, specifications, weight, snp_quantity,
            snp_volume, unit_cost, currency
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          projectId,
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
          part.currency
        ]);
      }
    }

    console.log(`✅ Migrated ${projects.length} projects with parts\n`);

    await client.query('COMMIT');
    console.log('✅ Data migration completed successfully!\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during data migration:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if executed directly
if (require.main === module) {
  seedData()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { seedData };
