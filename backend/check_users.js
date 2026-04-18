const { query } = require('./config/database');

async function sendToApproval() {
  try {
    console.log('\n=== CORRIGIENDO ESCALATION PATH Y ENVIANDO A APROBACIÓN ===');

    // Primero, obtener el reporte para ver su escalation_path actual
    const currentReport = await query(`
      SELECT id, created_by, escalation_path
      FROM eightd_reports
      WHERE id = 4
    `);

    if (currentReport.rows.length > 0) {
      const report = currentReport.rows[0];
      const creatorId = report.created_by;
      let escalation = report.escalation_path;

      console.log('Creador del reporte (ID):', creatorId);
      console.log('Escalation path actual:', JSON.stringify(escalation, null, 2));

      // Corregir el escalation_path para que el primer usuario de issue_users sea el creador
      if (escalation && escalation.issue_users) {
        // Guardar los aprobadores (elementos 2, 3, 4 del array original)
        const approvers = escalation.issue_users.slice(1);

        // Reconstruir con el creador como primer elemento
        escalation.issue_users = [creatorId, ...approvers];

        console.log('\n✅ Escalation path corregido:');
        console.log('issue_users:', escalation.issue_users);
        console.log('[0] = Creador (ID:', creatorId + ')');
        console.log('[1-3] = Aprobadores:', approvers);
      }

      // Actualizar reporte con escalation_path corregido Y enviar a aprobación
      await query(`
        UPDATE eightd_reports
        SET current_approval_step = 1,
            d1_d2_d3_approval_status = 'pending_approval_1',
            approval_1_status = 'pending',
            escalation_path = $1
        WHERE id = 4
      `, [JSON.stringify(escalation)]);

      console.log('\n✅ Reporte actualizado con escalation_path corregido');
    }

    console.log('✅ Reporte actualizado a Step 1 (pending_approval_1)');
    console.log('\n=== VERIFICANDO CAMBIOS ===');
    const report = await query(`
      SELECT
        r.id,
        r.report_id,
        r.title,
        r.current_approval_step,
        r.d1_d2_d3_approval_status,
        r.approval_1_status,
        r.approval_2_status,
        r.approval_3_status,
        r.created_by,
        r.escalation_path,
        creator.first_name || ' ' || creator.last_name as creator_name
      FROM eightd_reports r
      LEFT JOIN users creator ON r.created_by = creator.id
      WHERE r.report_id = '8D-2025-0316'
    `);

    if (report.rows.length > 0) {
      const r = report.rows[0];
      console.log('ID:', r.id);
      console.log('Título:', r.title);
      console.log('Creado por:', r.creator_name, '(ID:', r.created_by + ')');
      console.log('\n--- ESTADO DE APROBACIÓN ---');
      console.log('Step actual:', r.current_approval_step);
      console.log('Status D1-D2-D3:', r.d1_d2_d3_approval_status);
      console.log('Aprobación 1:', r.approval_1_status || 'null');
      console.log('Aprobación 2:', r.approval_2_status || 'null');
      console.log('Aprobación 3:', r.approval_3_status || 'null');

      if (r.escalation_path) {
        let escalation;
        try {
          // Si es string, parsearlo; si ya es objeto, usarlo directamente
          escalation = typeof r.escalation_path === 'string'
            ? JSON.parse(r.escalation_path)
            : r.escalation_path;
        } catch (e) {
          console.log('Error parseando escalation_path:', e.message);
          console.log('Valor raw:', r.escalation_path);
          return;
        }

        console.log('\n--- APROBADORES DEL ISSUE (D1-D2-D3) ---');
        if (escalation.issue_users && escalation.issue_users.length > 0) {
          console.log('IDs de aprobadores:', escalation.issue_users);

          // Get user details
          const userIds = escalation.issue_users.slice(0, 3);
          const users = await query(`
            SELECT id, first_name, last_name, email, position
            FROM users
            WHERE id = ANY($1)
            ORDER BY CASE
              WHEN id = $2 THEN 1
              WHEN id = $3 THEN 2
              WHEN id = $4 THEN 3
              ELSE 4
            END
          `, [userIds, userIds[0], userIds[1], userIds[2]]);

          console.log('\n--- DETALLES DE APROBADORES ---');
          users.rows.forEach((user, idx) => {
            console.log(`\nAprobador ${idx + 1}:`);
            console.log(`  Nombre: ${user.first_name} ${user.last_name}`);
            console.log(`  Email: ${user.email}`);
            console.log(`  Puesto: ${user.position}`);
            console.log(`  ID: ${user.id}`);
          });
        }
      }
    } else {
      console.log('Reporte no encontrado');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendToApproval();
