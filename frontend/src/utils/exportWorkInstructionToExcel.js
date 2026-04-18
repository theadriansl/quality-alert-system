import ExcelJS from 'exceljs';

/**
 * Export Work Instruction to Excel with professional formatting
 * @param {Object} workInstruction - The work instruction object
 * @param {Object} job - The job object (optional)
 */
export const exportWorkInstructionToExcel = async (workInstruction, job = null) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Quality Alert System';
  workbook.created = new Date();

  // Create main sheet
  const sheet = workbook.addWorksheet('Work Instruction', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.7,
        right: 0.7,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3
      }
    }
  });

  // Set column widths
  sheet.columns = [
    { width: 5 },   // A - Step number
    { width: 25 },  // B - Title
    { width: 50 },  // C - Description
    { width: 30 }   // D - Additional info
  ];

  let currentRow = 1;

  // ==================== HEADER SECTION ====================
  // Company logo placeholder / Title
  sheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const titleCell = sheet.getCell(`A${currentRow}`);
  titleCell.value = 'WORK INSTRUCTION';
  titleCell.font = { size: 20, bold: true, color: { argb: 'FF2563eb' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFf0f9ff' }
  };
  sheet.getRow(currentRow).height = 35;
  currentRow++;

  // Document Info Header
  currentRow++;
  sheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const docInfoCell = sheet.getCell(`A${currentRow}`);
  docInfoCell.value = 'DOCUMENT INFORMATION';
  docInfoCell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  docInfoCell.alignment = { horizontal: 'center', vertical: 'middle' };
  docInfoCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1e40af' }
  };
  sheet.getRow(currentRow).height = 25;
  currentRow++;

  // Document Details
  const docDetails = [
    ['Work Instruction Name:', workInstruction.name],
    ['Part Number:', workInstruction.partNumber],
    ['Revision:', workInstruction.revision],
    ['Status:', workInstruction.status],
    ['Created Date:', new Date(workInstruction.createdAt).toLocaleDateString()],
    ['Created By:', workInstruction.createdBy || '-'],
    ['Approved By:', workInstruction.approvedBy || '-'],
    ['Approved Date:', workInstruction.approvedDate ? new Date(workInstruction.approvedDate).toLocaleDateString() : '-']
  ];

  if (job) {
    docDetails.push(['Job Number:', job.jobNumber || '-']);
    docDetails.push(['Customer:', job.clientName || '-']);
  }

  docDetails.forEach(([label, value]) => {
    sheet.mergeCells(`A${currentRow}:B${currentRow}`);
    const labelCell = sheet.getCell(`A${currentRow}`);
    labelCell.value = label;
    labelCell.font = { bold: true, size: 10 };
    labelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFe5e7eb' }
    };
    labelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    labelCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    sheet.mergeCells(`C${currentRow}:D${currentRow}`);
    const valueCell = sheet.getCell(`C${currentRow}`);
    valueCell.value = value;
    valueCell.font = { size: 10 };
    valueCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    valueCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    sheet.getRow(currentRow).height = 20;
    currentRow++;
  });

  // ==================== OVERVIEW SECTION ====================
  currentRow++;
  sheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const overviewHeaderCell = sheet.getCell(`A${currentRow}`);
  overviewHeaderCell.value = 'OVERVIEW';
  overviewHeaderCell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  overviewHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  overviewHeaderCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1e40af' }
  };
  sheet.getRow(currentRow).height = 25;
  currentRow++;

  // Description
  if (workInstruction.description) {
    sheet.getCell(`A${currentRow}`).value = 'Description:';
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 10 };
    sheet.getCell(`A${currentRow}`).alignment = { vertical: 'top' };
    currentRow++;

    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const descCell = sheet.getCell(`A${currentRow}`);
    descCell.value = workInstruction.description;
    descCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 };
    descCell.font = { size: 10 };
    sheet.getRow(currentRow).height = 30;
    currentRow++;
  }

  // Purpose
  if (workInstruction.purpose) {
    currentRow++;
    sheet.getCell(`A${currentRow}`).value = 'Purpose:';
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 10 };
    sheet.getCell(`A${currentRow}`).alignment = { vertical: 'top' };
    currentRow++;

    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const purposeCell = sheet.getCell(`A${currentRow}`);
    purposeCell.value = workInstruction.purpose;
    purposeCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 };
    purposeCell.font = { size: 10 };
    sheet.getRow(currentRow).height = 30;
    currentRow++;
  }

  // Scope
  if (workInstruction.scope) {
    currentRow++;
    sheet.getCell(`A${currentRow}`).value = 'Scope:';
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 10 };
    sheet.getCell(`A${currentRow}`).alignment = { vertical: 'top' };
    currentRow++;

    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const scopeCell = sheet.getCell(`A${currentRow}`);
    scopeCell.value = workInstruction.scope;
    scopeCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 };
    scopeCell.font = { size: 10 };
    sheet.getRow(currentRow).height = 30;
    currentRow++;
  }

  // ==================== SAFETY REQUIREMENTS ====================
  if (workInstruction.safetyRequirements && workInstruction.safetyRequirements.length > 0) {
    currentRow += 2;
    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const safetyHeaderCell = sheet.getCell(`A${currentRow}`);
    safetyHeaderCell.value = ' SAFETY REQUIREMENTS';
    safetyHeaderCell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    safetyHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    safetyHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFdc2626' }
    };
    sheet.getRow(currentRow).height = 25;
    currentRow++;

    workInstruction.safetyRequirements.forEach((req, index) => {
      sheet.mergeCells(`A${currentRow}:D${currentRow}`);
      const reqCell = sheet.getCell(`A${currentRow}`);
      reqCell.value = `${index + 1}. ${req}`;
      reqCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
      reqCell.font = { size: 10, bold: true };
      reqCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFfee2e2' }
      };
      reqCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      sheet.getRow(currentRow).height = 25;
      currentRow++;
    });
  }

  // ==================== EQUIPMENT & MATERIALS ====================
  currentRow += 2;
  sheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const resourcesHeaderCell = sheet.getCell(`A${currentRow}`);
  resourcesHeaderCell.value = 'REQUIRED RESOURCES';
  resourcesHeaderCell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  resourcesHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  resourcesHeaderCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1e40af' }
  };
  sheet.getRow(currentRow).height = 25;
  currentRow++;

  // Equipment
  if (workInstruction.equipment && workInstruction.equipment.length > 0) {
    sheet.mergeCells(`A${currentRow}:B${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = 'Equipment:';
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 10 };
    sheet.getCell(`A${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFe5e7eb' }
    };
    currentRow++;

    workInstruction.equipment.forEach((item) => {
      sheet.mergeCells(`A${currentRow}:D${currentRow}`);
      const itemCell = sheet.getCell(`A${currentRow}`);
      itemCell.value = `• ${item}`;
      itemCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      itemCell.font = { size: 10 };
      currentRow++;
    });
  }

  // Tools
  if (workInstruction.tools && workInstruction.tools.length > 0) {
    currentRow++;
    sheet.mergeCells(`A${currentRow}:B${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = 'Tools:';
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 10 };
    sheet.getCell(`A${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFe5e7eb' }
    };
    currentRow++;

    workInstruction.tools.forEach((item) => {
      sheet.mergeCells(`A${currentRow}:D${currentRow}`);
      const itemCell = sheet.getCell(`A${currentRow}`);
      itemCell.value = `• ${item}`;
      itemCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      itemCell.font = { size: 10 };
      currentRow++;
    });
  }

  // Materials
  if (workInstruction.materials && workInstruction.materials.length > 0) {
    currentRow++;
    sheet.mergeCells(`A${currentRow}:B${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = 'Materials:';
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 10 };
    sheet.getCell(`A${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFe5e7eb' }
    };
    currentRow++;

    workInstruction.materials.forEach((item) => {
      sheet.mergeCells(`A${currentRow}:D${currentRow}`);
      const itemCell = sheet.getCell(`A${currentRow}`);
      itemCell.value = `• ${item}`;
      itemCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      itemCell.font = { size: 10 };
      currentRow++;
    });
  }

  // ==================== STEP-BY-STEP INSTRUCTIONS ====================
  if (workInstruction.steps && workInstruction.steps.length > 0) {
    currentRow += 2;
    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const stepsHeaderCell = sheet.getCell(`A${currentRow}`);
    stepsHeaderCell.value = 'STEP-BY-STEP INSTRUCTIONS';
    stepsHeaderCell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    stepsHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    stepsHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1e40af' }
    };
    sheet.getRow(currentRow).height = 25;
    currentRow++;

    for (const step of workInstruction.steps) {
      currentRow++;

      // Step Header
      sheet.mergeCells(`A${currentRow}:D${currentRow}`);
      const stepHeaderCell = sheet.getCell(`A${currentRow}`);
      stepHeaderCell.value = `STEP ${step.stepNumber}: ${step.title}`;
      stepHeaderCell.font = { size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      stepHeaderCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      stepHeaderCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3b82f6' }
      };
      sheet.getRow(currentRow).height = 25;
      currentRow++;

      // Step Description
      sheet.mergeCells(`A${currentRow}:D${currentRow}`);
      const stepDescCell = sheet.getCell(`A${currentRow}`);
      stepDescCell.value = step.description;
      stepDescCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 };
      stepDescCell.font = { size: 10 };
      stepDescCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      sheet.getRow(currentRow).height = Math.max(30, step.description.length / 3);
      currentRow++;

      // Estimated Time
      if (step.estimatedTime) {
        sheet.mergeCells(`A${currentRow}:D${currentRow}`);
        const timeCell = sheet.getCell(`A${currentRow}`);
        timeCell.value = ` Estimated Time: ${step.estimatedTime}`;
        timeCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        timeCell.font = { size: 9, italic: true };
        timeCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFfef3c7' }
        };
        sheet.getRow(currentRow).height = 20;
        currentRow++;
      }

      // Checkpoints
      if (step.checkpoints && step.checkpoints.length > 0) {
        currentRow++;
        sheet.mergeCells(`A${currentRow}:D${currentRow}`);
        const checkpointsHeaderCell = sheet.getCell(`A${currentRow}`);
        checkpointsHeaderCell.value = 'Quality Checkpoints:';
        checkpointsHeaderCell.font = { size: 10, bold: true };
        checkpointsHeaderCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        checkpointsHeaderCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFdcfce7' }
        };
        sheet.getRow(currentRow).height = 20;
        currentRow++;

        step.checkpoints.forEach((checkpoint) => {
          sheet.mergeCells(`A${currentRow}:D${currentRow}`);
          const checkpointCell = sheet.getCell(`A${currentRow}`);
          checkpointCell.value = ` ${checkpoint}`;
          checkpointCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 2 };
          checkpointCell.font = { size: 9 };
          checkpointCell.border = {
            left: { style: 'thin' },
            right: { style: 'thin' },
            bottom: { style: 'hair' }
          };
          sheet.getRow(currentRow).height = 20;
          currentRow++;
        });
      }

      // Images placeholder
      if (step.images && step.images.length > 0) {
        currentRow++;
        sheet.mergeCells(`A${currentRow}:D${currentRow}`);
        const imagesCell = sheet.getCell(`A${currentRow}`);
        imagesCell.value = ` Images: ${step.images.length} image(s) attached to this step`;
        imagesCell.alignment = { horizontal: 'center', vertical: 'middle' };
        imagesCell.font = { size: 9, italic: true, color: { argb: 'FF6b7280' } };
        imagesCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFf3f4f6' }
        };
        sheet.getRow(currentRow).height = 25;
        currentRow++;
      }

      currentRow++;
    }
  }

  // ==================== FOOTER ====================
  currentRow += 2;
  sheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const footerCell = sheet.getCell(`A${currentRow}`);
  footerCell.value = `Generated by Quality Alert System - ${new Date().toLocaleString()}`;
  footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  footerCell.font = { size: 8, italic: true, color: { argb: 'FF9ca3af' } };
  footerCell.border = {
    top: { style: 'double', color: { argb: 'FF2563eb' } }
  };

  // Generate and download file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `WI_${workInstruction.partNumber}_${workInstruction.revision}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);

  return true;
};
