const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'apqp_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

// Data arrays for realistic generation
const problemTypes = ['Dimensional', 'Visual', 'Functional', 'Material', 'Assembly', 'Packaging', 'Documentation', 'Contamination'];
const severities = ['Critical', 'Major', 'Minor'];
const tipoIssue = ['Customer Complaint', 'Internal Detection', 'Supplier Issue', 'Process Deviation', 'Audit Finding'];
const tipoResp = ['Production', 'Quality', 'Engineering', 'Supplier', 'Logistics'];
const timingOccurrence = ['Pre-production', 'Production', 'Post-production', 'Field Return', 'Customer Site'];
const statuses = ['Open', 'In Progress', 'Pending Approval', 'Closed'];
const currentSteps = ['D1', 'D2', 'D3', 'D3-MFG', 'D4', 'D5', 'D6', 'D7', 'D8'];
const approvalStatuses = ['pending', 'approved', 'rejected'];

const defectDescriptions = [
  'Surface scratches visible on painted surface',
  'Dimensional deviation exceeds tolerance by 0.5mm',
  'Clip retention force below specification',
  'Color mismatch between components',
  'Weld porosity detected in structural joint',
  'Missing fastener during assembly',
  'Incorrect material hardness',
  'Gap and flush misalignment',
  'Surface contamination with oil residue',
  'Incomplete thread engagement',
  'Burr present on machined edge',
  'Warpage exceeding flatness tolerance',
  'Incorrect label placement',
  'Moisture contamination in packaging',
  'Incorrect revision documentation supplied'
];

const rootCauses = [
  'Worn tooling causing dimensional variation',
  'Incorrect machine parameter settings',
  'Operator training gap identified',
  'Supplier material lot variation',
  'Environmental conditions outside specification',
  'Preventive maintenance overdue',
  'Design tolerance too tight for process capability',
  'Inspection method inadequate',
  'Material handling damage during transport',
  'Fixture misalignment detected'
];

const containmentActions = [
  { action: 'Quarantine affected lot', responsible: 'Quality', status: 'completed', dueDate: '2026-01-15' },
  { action: '100% inspection of WIP inventory', responsible: 'Production', status: 'completed', dueDate: '2026-01-16' },
  { action: 'Sort and segregate suspect material', responsible: 'Warehouse', status: 'completed', dueDate: '2026-01-17' },
  { action: 'Notify customer of containment status', responsible: 'Quality', status: 'completed', dueDate: '2026-01-15' }
];

const correctiveActions = [
  { action: 'Replace worn tooling', responsible: 'Maintenance', status: 'completed', dueDate: '2026-01-20' },
  { action: 'Update process parameters', responsible: 'Engineering', status: 'in_progress', dueDate: '2026-01-25' },
  { action: 'Retrain operators on procedure', responsible: 'Training', status: 'pending', dueDate: '2026-02-01' },
  { action: 'Implement poka-yoke device', responsible: 'Engineering', status: 'pending', dueDate: '2026-02-15' }
];

const preventiveActions = [
  { action: 'Add inspection point to control plan', responsible: 'Quality', status: 'completed' },
  { action: 'Update PFMEA with new failure mode', responsible: 'Engineering', status: 'completed' },
  { action: 'Horizontal deployment to similar processes', responsible: 'Quality', status: 'in_progress' },
  { action: 'Add to operator training curriculum', responsible: 'Training', status: 'pending' }
];

const userIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const clients = [
  { id: 1, name: 'Faurecia Sistemas Automotrices SA de CV' },
  { id: 2, name: 'Gissing North America LLC' },
  { id: 3, name: 'Lucid Headquarters' },
  { id: 4, name: 'ElringKlinger Canada Inc' },
  { id: 5, name: 'Mubea de México S de RL de CV' },
  { id: 6, name: 'TechFlow Manufacturing Inc' }
];

const partNumbers = [
  { number: 'FAU-IP-001', name: 'Instrument Panel Main Frame', cost: 125.50 },
  { number: 'FAU-IP-002', name: 'Center Console Trim', cost: 45.00 },
  { number: 'FAU-IP-003', name: 'Air Vent Bezel', cost: 12.75 },
  { number: 'GIS-SB-001', name: 'Seat Belt Buckle Assembly', cost: 28.50 },
  { number: 'GIS-SB-002', name: 'Belt Retractor Mechanism', cost: 65.00 },
  { number: 'LUC-CH-001', name: 'Battery Housing Frame', cost: 450.00 },
  { number: 'LUC-CH-002', name: 'Motor Mount Bracket', cost: 89.00 },
  { number: 'ELK-GK-001', name: 'Cylinder Head Gasket', cost: 35.00 },
  { number: 'ELK-GK-002', name: 'Oil Pan Seal', cost: 18.50 },
  { number: 'MUB-SP-001', name: 'Suspension Spring', cost: 42.00 },
  { number: 'MUB-SP-002', name: 'Stabilizer Bar', cost: 78.00 },
  { number: 'TF-MF-001', name: 'Precision Shaft', cost: 156.00 },
  { number: 'TF-MF-002', name: 'Bearing Housing', cost: 89.00 }
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function generateTeamMembers() {
  const count = randomInt(3, 6);
  const members = [];
  const usedIds = new Set();
  for (let i = 0; i < count; i++) {
    let userId;
    do {
      userId = randomItem(userIds);
    } while (usedIds.has(userId));
    usedIds.add(userId);
    members.push({
      userId,
      role: randomItem(['Team Leader', 'Quality Rep', 'Engineering Rep', 'Production Rep', 'Supplier Rep', 'Logistics Rep']),
      assignedAt: new Date().toISOString()
    });
  }
  return members;
}

function generateFiveWhys() {
  return {
    why1: { question: 'Why did the defect occur?', answer: 'Machine parameter was out of specification' },
    why2: { question: 'Why was the parameter out of spec?', answer: 'Adjustment was not verified after maintenance' },
    why3: { question: 'Why was it not verified?', answer: 'No checklist exists for post-maintenance verification' },
    why4: { question: 'Why is there no checklist?', answer: 'Process was not updated when new equipment was installed' },
    why5: { question: 'Why was process not updated?', answer: 'Management of change procedure not followed' }
  };
}

function generateFishbone() {
  return {
    man: ['Training gap', 'Fatigue', 'New operator'],
    machine: ['Worn tooling', 'Calibration drift', 'Maintenance overdue'],
    method: ['Unclear work instruction', 'Sequence error', 'Missing verification step'],
    material: ['Lot variation', 'Supplier change', 'Storage conditions'],
    measurement: ['Gage R&R issue', 'Wrong measurement point', 'Sampling inadequate'],
    environment: ['Temperature variation', 'Humidity', 'Contamination']
  };
}

function generate4MEvaluation() {
  return {
    man: { evaluated: true, findings: 'Operator training records reviewed, gap identified in procedure X-123', isRootCause: false },
    machine: { evaluated: true, findings: 'Equipment PM records indicate overdue maintenance on spindle', isRootCause: true },
    method: { evaluated: true, findings: 'Work instruction WI-456 reviewed, sequence is correct', isRootCause: false },
    material: { evaluated: true, findings: 'Material certification reviewed, within specification', isRootCause: false }
  };
}

function generateDefinitiveActions() {
  return [
    { id: 1, action: 'Install new precision tooling with improved tolerance', responsible: 'Engineering', dueDate: '2026-02-15', status: 'completed', effectiveness: 'verified' },
    { id: 2, action: 'Update control plan to include SPC monitoring', responsible: 'Quality', dueDate: '2026-02-20', status: 'completed', effectiveness: 'pending' },
    { id: 3, action: 'Modify fixture design for improved repeatability', responsible: 'Engineering', dueDate: '2026-02-28', status: 'in_progress', effectiveness: 'pending' }
  ];
}

async function generateReports() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Cleaning existing 8D data...');
    await client.query('DELETE FROM eightd_attachments');
    await client.query('DELETE FROM eightd_parts');
    await client.query('DELETE FROM eightd_status_history');
    await client.query('DELETE FROM eightd_reports');

    console.log('Generating 50 8D reports...');

    for (let i = 1; i <= 50; i++) {
      const clientData = randomItem(clients);
      const part = randomItem(partNumbers);
      const severity = randomItem(severities);
      const currentStep = currentSteps[Math.min(Math.floor(i / 6), currentSteps.length - 1)]; // Distribute across steps
      const progressMap = { 'D1': 10, 'D2': 20, 'D3': 30, 'D3-MFG': 35, 'D4': 50, 'D5': 60, 'D6': 75, 'D7': 90, 'D8': 100 };
      const progress = progressMap[currentStep] || 50;

      const issueDate = randomDate(new Date('2025-11-01'), new Date('2026-02-01'));
      const targetDate = randomDate(new Date('2026-02-15'), new Date('2026-04-30'));

      // Determine approval status based on current step
      const stepIndex = currentSteps.indexOf(currentStep);
      const d1Completed = stepIndex >= 1;
      const d2Completed = stepIndex >= 2;
      const d3Completed = stepIndex >= 3;
      const d4Completed = stepIndex >= 4;
      const d5Completed = stepIndex >= 5;
      const d6Completed = stepIndex >= 6;
      const d7Completed = stepIndex >= 7;
      const d8Completed = stepIndex >= 8;

      const approvalStep = d3Completed ? 3 : (d2Completed ? 2 : (d1Completed ? 1 : 0));

      const report = {
        report_id: `8D-2026-${String(i).padStart(4, '0')}`,
        title: `${randomItem(defectDescriptions)} - ${part.name}`,
        description: `Defect detected on ${part.name} (${part.number}) during ${randomItem(timingOccurrence)} phase. ${randomItem(defectDescriptions)}. Customer: ${clientData.name}`,
        supplier_name: randomItem(['ABC Suppliers', 'XYZ Manufacturing', 'Quality Components Inc', 'Precision Parts Ltd', 'Global Materials Co']),
        supplier_account: `SUP-${randomInt(1000, 9999)}`,
        part_number: part.number,
        part_name: part.name,
        problem_type: randomItem(problemTypes),
        severity: severity,
        tipo_issue: randomItem(tipoIssue),
        tipo_resp: randomItem(tipoResp),
        timing_occurrence: randomItem(timingOccurrence),
        estimated_cost: randomInt(500, 50000),
        issue_date: issueDate,
        target_closure_date: targetDate,
        customer_impact: `Potential ${severity.toLowerCase()} impact on customer ${clientData.name}. ${randomInt(100, 5000)} units potentially affected.`,
        status: d8Completed ? 'Closed' : (stepIndex >= 3 ? 'In Progress' : 'Open'),
        current_step: currentStep,
        progress_percentage: progress,
        issue_assigned_to: randomItem(userIds),
        countermeasure_assigned_to: randomItem(userIds),
        confirmation_assigned_to: randomItem(userIds),
        created_by: randomItem(userIds),

        // D1 - Team Formation
        d1_team_members: JSON.stringify(generateTeamMembers()),
        d1_champion_id: randomItem(userIds),
        d1_completed: d1Completed,
        d1_completed_at: d1Completed ? new Date().toISOString() : null,

        // D2 - Problem Description
        d2_problem_description: d2Completed ? `Detailed problem: ${randomItem(defectDescriptions)}. Discovered during ${randomItem(timingOccurrence)} inspection. Affected quantity: ${randomInt(50, 500)} units.` : null,
        d2_is_or_is_not: d2Completed ? JSON.stringify({
          isWhat: 'Dimensional defect on critical feature',
          isNotWhat: 'Surface finish issue',
          isWhere: 'Assembly line 3, Station 5',
          isNotWhere: 'Other production lines',
          isWhen: 'During second shift operations',
          isNotWhen: 'First or third shift',
          isExtent: `${randomInt(2, 15)}% of production lot`,
          isNotExtent: 'Isolated to specific lot'
        }) : null,
        d2_completed: d2Completed,
        d2_completed_at: d2Completed ? new Date().toISOString() : null,

        // D3 - Containment Actions
        d3_containment_actions: d3Completed ? JSON.stringify(containmentActions) : null,
        d3_detection_points: d3Completed ? JSON.stringify([
          { point: 'Incoming inspection', method: 'Visual and dimensional check' },
          { point: 'In-process inspection', method: 'Go/No-Go gauge' },
          { point: 'Final inspection', method: 'CMM measurement' }
        ]) : null,
        d3_non_detection_reasons: d3Completed ? JSON.stringify([
          { reason: 'Sampling plan did not catch defect', improvement: 'Increase sample size' },
          { reason: 'Inspection method inadequate', improvement: 'Add measurement point' }
        ]) : null,
        d3_suspect_material_disposal: d3Completed ? 'Quarantined material to be scrapped after customer approval' : null,
        d3_conformance_guarantee: d3Completed ? '100% inspection implemented to guarantee conformance of all shipped parts' : null,
        d3_requires_rework: randomInt(0, 1) === 1,
        d3_rework_unit_cost: randomInt(5, 50),
        d3_real_impact_cost: randomInt(1000, 25000),
        d3_completed: d3Completed,
        d3_completed_at: d3Completed ? new Date().toISOString() : null,

        // D3-MFG
        d3_mfg_status: d3Completed ? 'approved' : 'pending',
        d3_mfg_temporary_controls: d3Completed ? JSON.stringify([
          { control: 'Additional inspection point added', location: 'Station 5' },
          { control: 'Red tag on suspect containers', location: 'Warehouse' }
        ]) : null,
        d3_mfg_inspection_points: d3Completed ? JSON.stringify([
          { point: 'Pre-operation check', frequency: 'Every hour' },
          { point: 'First piece inspection', frequency: 'Every lot' }
        ]) : null,
        d3_mfg_completed: d3Completed,

        // D4 - Root Cause Analysis
        d4_analysis_technique: d4Completed ? randomItem(['5-Why', 'Fishbone', 'Is/Is Not', '4M']) : null,
        d4_root_causes: d4Completed ? JSON.stringify([randomItem(rootCauses)]) : null,
        d4_five_whys_analysis: d4Completed ? JSON.stringify(generateFiveWhys()) : null,
        d4_fishbone_analysis: d4Completed ? JSON.stringify(generateFishbone()) : null,
        d4_potential_causes: d4Completed ? JSON.stringify(rootCauses.slice(0, 4)) : null,
        d4_root_cause: d4Completed ? randomItem(rootCauses) : null,
        d4_verification_method: d4Completed ? 'Process capability study and designed experiment to verify root cause' : null,
        d4_verification_evidence: d4Completed ? 'Cpk improved from 0.8 to 1.67 after implementing corrective action on identified root cause' : null,
        d4_4m_evaluation: d4Completed ? JSON.stringify(generate4MEvaluation()) : null,
        d4_5whys_analysis: d4Completed ? JSON.stringify(generateFiveWhys()) : null,
        d4_status: d4Completed ? 'approved' : 'pending',
        d4_completed: d4Completed,
        d4_completed_at: d4Completed ? new Date().toISOString() : null,

        // D5 - Corrective Actions Selection
        d5_corrective_actions: d5Completed ? JSON.stringify(correctiveActions) : null,
        d5_final_root_cause: d5Completed ? randomItem(rootCauses) : null,
        d5_analysis_responsible_user_id: randomItem(userIds),
        d5_status: d5Completed ? 'approved' : 'pending',
        d5_completed: d5Completed,
        d5_completed_at: d5Completed ? new Date().toISOString() : null,

        // D6 - Implementation & Validation
        d6_implementation_plan: d6Completed ? JSON.stringify({
          startDate: '2026-01-15',
          endDate: '2026-02-28',
          milestones: [
            { milestone: 'Tooling modification', date: '2026-01-20', status: 'completed' },
            { milestone: 'Process validation', date: '2026-02-01', status: 'completed' },
            { milestone: 'PPAP submission', date: '2026-02-15', status: 'in_progress' }
          ]
        }) : null,
        d6_validation_plan: d6Completed ? JSON.stringify({
          method: 'Process capability study',
          sampleSize: 50,
          acceptanceCriteria: 'Cpk >= 1.33',
          results: 'Cpk = 1.67, validation passed'
        }) : null,
        d6_definitive_actions: d6Completed ? JSON.stringify(generateDefinitiveActions()) : null,
        d6_status: d6Completed ? 'approved' : 'pending',
        d6_completed: d6Completed,
        d6_completed_at: d6Completed ? new Date().toISOString() : null,

        // D7 - Preventive Actions
        d7_preventive_actions: d7Completed ? JSON.stringify(preventiveActions) : null,
        d7_confirmation_evidence: d7Completed ? JSON.stringify({
          evidence: 'Updated control plan, PFMEA, and work instructions',
          documents: ['CP-001 Rev C', 'PFMEA-001 Rev D', 'WI-456 Rev B'],
          auditDate: '2026-02-05',
          auditResult: 'Satisfactory'
        }) : null,
        d7_status: d7Completed ? 'approved' : 'draft',
        d7_completed: d7Completed,
        d7_completed_at: d7Completed ? new Date().toISOString() : null,

        // D8 - Closure
        d8_lessons_learned: d8Completed ? `Key learning: ${randomItem(rootCauses)}. Recommendation: Apply systematic approach to similar processes. Horizontal deployment completed to ${randomInt(2, 5)} similar product lines.` : null,
        d8_team_recognition: d8Completed ? JSON.stringify({
          recognitionType: 'Team Award',
          message: 'Outstanding problem solving and cross-functional collaboration',
          awardedBy: 'Quality Director',
          date: new Date().toISOString()
        }) : null,
        d8_closure_notes: d8Completed ? 'All actions verified effective. Customer accepted closure. No recurrence in 90 days of monitoring.' : null,
        d8_status: d8Completed ? 'approved' : 'pending',
        d8_completed: d8Completed,
        d8_completed_at: d8Completed ? new Date().toISOString() : null,
        d8_closed_at: d8Completed ? new Date().toISOString() : null,
        d8_closed_by: d8Completed ? randomItem(userIds) : null,

        // Approval columns
        current_approval_step: approvalStep,
        approval_1_status: d1Completed ? 'approved' : 'pending',
        approval_1_by: d1Completed ? randomItem(userIds) : null,
        approval_1_at: d1Completed ? new Date().toISOString() : null,
        approval_2_status: d2Completed ? 'approved' : 'pending',
        approval_2_by: d2Completed ? randomItem(userIds) : null,
        approval_2_at: d2Completed ? new Date().toISOString() : null,
        approval_3_status: d3Completed ? 'approved' : 'pending',
        approval_3_by: d3Completed ? randomItem(userIds) : null,
        approval_3_at: d3Completed ? new Date().toISOString() : null,

        d4_current_approval_step: d4Completed ? 3 : 0,
        d4_approval_1_status: d4Completed ? 'approved' : 'pending',
        d5_current_approval_step: d5Completed ? 3 : 0,
        d5_approval_1_status: d5Completed ? 'approved' : 'pending',
        d6_current_approval_step: d6Completed ? 3 : 0,
        d6_approval_1_status: d6Completed ? 'approved' : 'pending',
        d7_current_approval_step: d7Completed ? 3 : 0,
        d7_approval_1_status: d7Completed ? 'approved' : 'pending',
        d8_current_approval_step: d8Completed ? 3 : 0,
        d8_approval_1_status: d8Completed ? 'approved' : 'pending'
      };

      // Build INSERT query
      const columns = Object.keys(report);
      const values = Object.values(report);
      const placeholders = values.map((_, idx) => `$${idx + 1}`);

      const insertQuery = `
        INSERT INTO eightd_reports (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING id
      `;

      const result = await client.query(insertQuery, values);
      const reportId = result.rows[0].id;

      // Add parts to eightd_parts
      const partsCount = randomInt(1, 3);
      for (let p = 0; p < partsCount; p++) {
        const partData = randomItem(partNumbers);
        const partClient = randomItem(clients);
        await client.query(`
          INSERT INTO eightd_parts (
            report_id, client_id, client_name, part_number, part_name,
            client_part_number, revision, description, unit_cost, currency,
            qty_warehouse, qty_in_process, qty_in_transit, qty_with_customer,
            total_affected_qty, total_cost_impact
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `, [
          reportId,
          partClient.id,
          partClient.name,
          partData.number,
          partData.name,
          `CLI-${partData.number}`,
          `Rev ${String.fromCharCode(65 + randomInt(0, 3))}`,
          `${partData.name} for ${partClient.name}`,
          partData.cost,
          'USD',
          randomInt(50, 500),
          randomInt(20, 200),
          randomInt(10, 100),
          randomInt(100, 1000),
          randomInt(200, 2000),
          partData.cost * randomInt(50, 500)
        ]);
      }

      // Add status history
      await client.query(`
        INSERT INTO eightd_status_history (report_id, previous_status, new_status, previous_step, new_step, changed_by, change_reason, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [reportId, null, 'Open', null, 'D1', randomItem(userIds), 'Report created', new Date()]);

      if (stepIndex >= 1) {
        await client.query(`
          INSERT INTO eightd_status_history (report_id, previous_status, new_status, previous_step, new_step, changed_by, change_reason, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [reportId, 'Open', 'In Progress', 'D1', currentStep, randomItem(userIds), 'Team formed, advancing to next step', new Date()]);
      }

      console.log(`Created report ${i}/50: ${report.report_id} - Step: ${currentStep}`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Successfully created 50 8D reports!');

    // Summary
    const summary = await pool.query(`
      SELECT current_step, COUNT(*) as count
      FROM eightd_reports
      GROUP BY current_step
      ORDER BY current_step
    `);
    console.log('\nReport distribution by step:');
    summary.rows.forEach(row => {
      console.log(`  ${row.current_step}: ${row.count} reports`);
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

generateReports().catch(console.error);
