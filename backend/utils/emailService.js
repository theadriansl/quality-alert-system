const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send audit notification email
const sendAuditNotification = async ({ to, subject, reportId, reportTitle, itemName, checkItem, dueDate, round, isResend = false }) => {
  try {
    const transporter = createTransporter();

    const roundText = round > 1 ? ` (Ronda ${round})` : '';
    const resendText = isResend ? ' [RE-ENVIADO]' : '';

    const mailOptions = {
      from: `"Sistema de Calidad" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: `${resendText} Solicitud de Auditoría D7${roundText} - ${reportId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0072CE; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Solicitud de Auditoría D7${roundText}</h2>
          </div>

          <div style="padding: 20px; background-color: #f9fafb;">
            ${isResend ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 16px;">
                <strong>Este item ha sido re-enviado para auditoría.</strong>
                <p style="margin: 8px 0 0 0; font-size: 14px;">Por favor revise los cambios realizados.</p>
              </div>
            ` : ''}

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Reporte:</td>
                <td style="padding: 8px 0; color: #1f2937;">${reportId} - ${reportTitle}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Categoría:</td>
                <td style="padding: 8px 0; color: #1f2937;">${itemName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Item a verificar:</td>
                <td style="padding: 8px 0; color: #1f2937;">${checkItem || 'Sin especificar'}</td>
              </tr>
              ${dueDate ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Fecha límite:</td>
                <td style="padding: 8px 0; color: #1f2937;">${new Date(dueDate).toLocaleDateString('es-MX')}</td>
              </tr>
              ` : ''}
              ${round > 1 ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Ronda de auditoría:</td>
                <td style="padding: 8px 0; color: #f59e0b; font-weight: bold;">${round}</td>
              </tr>
              ` : ''}
            </table>

            <div style="margin-top: 24px; text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/audit-requests"
                 style="display: inline-block; background-color: #0072CE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Ir a Solicitudes de Auditoría
              </a>
            </div>
          </div>

          <div style="padding: 16px; background-color: #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
            Sistema de Gestión de Calidad - Este es un mensaje automático
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Audit notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending audit notification email:', error);
    return { success: false, error: error.message };
  }
};

// Send bulk audit notifications
const sendBulkAuditNotifications = async (auditors, reportInfo, items) => {
  const results = [];

  for (const auditor of auditors) {
    for (const item of items) {
      const result = await sendAuditNotification({
        to: auditor.email,
        reportId: reportInfo.reportId,
        reportTitle: reportInfo.title,
        itemName: item.name,
        checkItem: item.checkItem,
        dueDate: item.dueDate,
        round: item.auditRound || 1,
        isResend: item.isResend || false
      });
      results.push({ auditor: auditor.email, item: item.name, ...result });
    }
  }

  return results;
};

// Send MRB campaign notification
const sendMrbNotification = async ({ to, recipientName, mrbNumber, mrbTitle, mrbId, recipientType, clientName, partNumber, inspectionCriteria, dispositionInstructions }) => {
  try {
    const transporter = createTransporter();
    const isValidation = recipientType === 'validation';
    const accentColor = isValidation ? '#0072CE' : '#7c3aed';
    const roleLabel = isValidation ? 'Validador' : 'Responsable de Respuesta';
    const actionLabel = isValidation ? 'Validar Resultado' : 'Registrar Disposición';
    const actionUrl = mrbId
      ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/mrb-campaign/${mrbId}`
      : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/mrb-campaigns`;

    const mailOptions = {
      from: `"Sistema de Calidad MRB" <${process.env.EMAIL_USER}>`,
      to,
      subject: `[MRB] ${mrbNumber} — ${mrbTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background-color: ${accentColor}; color: white; padding: 20px 24px;">
            <p style="margin: 0; font-size: 12px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px;">Material Review Board</p>
            <h2 style="margin: 6px 0 0 0; font-size: 20px;">${mrbNumber}</h2>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">${mrbTitle}</p>
          </div>

          <div style="padding: 20px 24px; background-color: #f9fafb;">
            <p style="margin: 0 0 16px 0; color: #374151;">Hola <strong>${recipientName}</strong>,</p>
            <p style="margin: 0 0 16px 0; color: #374151;">
              Has sido asignado como <strong>${roleLabel}</strong> en el siguiente caso MRB. Se requiere tu participación.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
              ${clientName ? `<tr><td style="padding: 7px 0; font-weight: 600; color: #6b7280; font-size: 13px; width: 160px;">Cliente</td><td style="padding: 7px 0; color: #1f2937; font-size: 13px;">${clientName}</td></tr>` : ''}
              ${partNumber ? `<tr><td style="padding: 7px 0; font-weight: 600; color: #6b7280; font-size: 13px;">Número de Parte</td><td style="padding: 7px 0; color: #1f2937; font-size: 13px;">${partNumber}</td></tr>` : ''}
              ${inspectionCriteria ? `<tr><td style="padding: 7px 0; font-weight: 600; color: #6b7280; font-size: 13px; vertical-align: top;">Criterio de Inspección</td><td style="padding: 7px 0; color: #1f2937; font-size: 13px;">${inspectionCriteria}</td></tr>` : ''}
              ${dispositionInstructions ? `<tr><td style="padding: 7px 0; font-weight: 600; color: #6b7280; font-size: 13px; vertical-align: top;">Instrucciones de Disposición</td><td style="padding: 7px 0; color: #1f2937; font-size: 13px;">${dispositionInstructions}</td></tr>` : ''}
            </table>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${actionUrl}" style="display: inline-block; background-color: ${accentColor}; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
                ${actionLabel}
              </a>
            </div>
          </div>

          <div style="padding: 14px 24px; background-color: #e5e7eb; text-align: center; font-size: 11px; color: #6b7280;">
            Sistema de Gestión de Calidad — Mensaje automático, no responder
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`MRB email sent to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending MRB notification email:', error);
    return { success: false, error: error.message };
  }
};

const sendMrbBulkNotifications = async (recipients, mrbInfo) => {
  const results = [];
  for (const r of recipients) {
    if (!r.email) continue;
    const result = await sendMrbNotification({
      to: r.email,
      recipientName: `${r.first_name || r.firstName || ''} ${r.last_name || r.lastName || ''}`.trim(),
      mrbNumber: mrbInfo.mrbNumber,
      mrbTitle: mrbInfo.title,
      mrbId: mrbInfo.mrbId,
      recipientType: r.recipientType || r.recipient_type,
      clientName: mrbInfo.clientName,
      partNumber: mrbInfo.partNumber,
      inspectionCriteria: mrbInfo.inspectionCriteria,
      dispositionInstructions: mrbInfo.dispositionInstructions
    });
    results.push({ email: r.email, ...result });
  }
  return results;
};

module.exports = {
  sendAuditNotification,
  sendBulkAuditNotifications,
  sendMrbNotification,
  sendMrbBulkNotifications
};
