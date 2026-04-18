/**
 * Quick script to approve all 3 steps of report 8D-2025-0316
 */

const { query, pool } = require('./config/database');

async function approveReport() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting approval process for 8D-2025-0316...\n');

    // Step 1: Approve as Approver 1 (user ID 2)
    console.log('✅ Step 1: Approving by Approver 1 (user 2)...');
    await client.query('BEGIN');
    await client.query(`
      UPDATE eightd_reports
      SET current_approval_step = 2,
          d1_d2_d3_approval_status = 'pending_approval_2',
          approval_1_status = 'approved',
          approval_1_by = 2,
          approval_1_at = NOW(),
          approval_2_status = 'pending'
      WHERE id = 4
    `);
    await client.query('COMMIT');
    console.log('   ✓ Approval 1 completed\n');

    // Step 2: Approve as Approver 2 (user ID 5)
    console.log('✅ Step 2: Approving by Approver 2 (user 5)...');
    await client.query('BEGIN');
    await client.query(`
      UPDATE eightd_reports
      SET current_approval_step = 3,
          d1_d2_d3_approval_status = 'pending_approval_3',
          approval_2_status = 'approved',
          approval_2_by = 5,
          approval_2_at = NOW(),
          approval_3_status = 'pending'
      WHERE id = 4
    `);
    await client.query('COMMIT');
    console.log('   ✓ Approval 2 completed\n');

    // Step 3: Final approval by Approver 3 (user ID 6)
    console.log('🎉 Step 3: FINAL APPROVAL by Approver 3 (user 6)...');
    await client.query('BEGIN');
    await client.query(`
      UPDATE eightd_reports
      SET current_approval_step = 4,
          d1_d2_d3_approval_status = 'approved',
          approval_3_status = 'approved',
          approval_3_by = 6,
          approval_3_at = NOW()
      WHERE id = 4
    `);
    await client.query('COMMIT');
    console.log('   ✓ FINAL APPROVAL completed\n');

    // Verify final status
    const result = await client.query(`
      SELECT id, report_id, d1_d2_d3_approval_status, current_approval_step
      FROM eightd_reports
      WHERE id = 4
    `);

    console.log('📊 Final Status:');
    console.log('   Report ID:', result.rows[0].report_id);
    console.log('   Approval Status:', result.rows[0].d1_d2_d3_approval_status);
    console.log('   Current Step:', result.rows[0].current_approval_step);
    console.log('\n🎉 SUCCESS! Report is now APPROVED!');
    console.log('✅ D3-MFG is now unlocked in the D4 tab!\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

approveReport();
