// WORK INSTRUCTIONS DATA
const workInstructions = [
  {
    id: 1,
    jobId: 1, // Faurecia - Instrument Panel Assembly
    name: 'Assembly Process for Instrument Panel - Model Y',
    partNumber: 'IP-ASSY-2024-Y',
    revision: 'Rev 3',
    status: 'Approved',

    // Overview
    description: 'Complete assembly process for instrument panel including bezel installation, cluster mounting, and airbag integration',
    purpose: 'Ensure consistent quality and safety standards in instrument panel assembly',
    scope: 'Applies to all Model Y instrument panel assemblies produced at Phoenix Plant',

    // Details
    equipment: ['Assembly Fixture A-101', 'Torque Wrench (5-25 Nm)', 'Digital Caliper', 'UV Lamp for Adhesive Curing'],
    materials: ['IP-ASSY-2024-Y (Main Panel)', 'IP-BEZEL-001 (Bezel)', 'Adhesive Type A-550', 'Mounting Bolts M6x20 (8 pcs)'],
    tools: ['Torque Wrench', 'Socket Set', 'Trim Removal Tools', 'Digital Caliper'],
    safetyRequirements: [
      'Safety glasses must be worn at all times',
      'Ensure airbag module is handled with ESD protection',
      'Do not activate airbag deployment mechanism',
      'Follow lockout/tagout procedures for fixture'
    ],
    qualityStandards: [
      'ISO 9001:2015 compliance required',
      'IATF 16949 automotive quality standards',
      'Customer-specific requirements per Faurecia QMS',
      'All measurements within ±0.5mm tolerance'
    ],

    // Steps
    steps: [
      {
        stepNumber: 1,
        title: 'Prepare Work Area and Verify Parts',
        description: 'Clean assembly fixture, verify all parts are present and match work order. Check for any visual defects on incoming parts.',
        images: [],
        checkpoints: [
          'Fixture is clean and free of debris',
          'All parts present per BOM',
          'No visible defects on parts',
          'Part numbers verified against work order'
        ],
        estimatedTime: '2 minutes'
      },
      {
        stepNumber: 2,
        title: 'Install Main Panel on Fixture',
        description: 'Place main instrument panel (IP-ASSY-2024-Y) onto assembly fixture A-101. Ensure alignment pins are properly seated.',
        images: [],
        checkpoints: [
          'Panel properly seated on fixture',
          'All alignment pins engaged',
          'No gaps between panel and fixture',
          'Panel is level and stable'
        ],
        estimatedTime: '3 minutes'
      },
      {
        stepNumber: 3,
        title: 'Apply Adhesive to Bezel Mounting Points',
        description: 'Apply adhesive Type A-550 to the 8 designated mounting points on the main panel. Use controlled amount (2-3mm bead).',
        images: [],
        checkpoints: [
          'Adhesive applied to all 8 points',
          'Bead size is 2-3mm',
          'No excess adhesive spillage',
          'Adhesive batch number recorded'
        ],
        estimatedTime: '4 minutes'
      },
      {
        stepNumber: 4,
        title: 'Install Center Console Bezel',
        description: 'Carefully position bezel (IP-BEZEL-001) onto main panel. Apply even pressure for 30 seconds. Verify alignment before adhesive sets.',
        images: [],
        checkpoints: [
          'Bezel aligned with panel edges',
          'Gap measurement ≤ 0.5mm on all sides',
          'No adhesive visible from outside',
          'Pressure applied for full 30 seconds'
        ],
        estimatedTime: '5 minutes'
      },
      {
        stepNumber: 5,
        title: 'Cure Adhesive with UV Lamp',
        description: 'Use UV lamp to cure adhesive for 2 minutes. Maintain lamp distance of 10-15cm from bezel.',
        images: [],
        checkpoints: [
          'UV lamp functional (check indicator)',
          'Curing time = 2 minutes ±5 seconds',
          'Lamp distance maintained',
          'All adhesive points exposed to UV'
        ],
        estimatedTime: '3 minutes'
      },
      {
        stepNumber: 6,
        title: 'Install Digital Cluster Display',
        description: 'Mount digital cluster (IP-CLUSTER-DIG) into designated opening. Connect electrical harness and secure with 4 mounting clips.',
        images: [],
        checkpoints: [
          'Cluster seated properly in opening',
          'Electrical connection secure (audible click)',
          'All 4 mounting clips engaged',
          'Display test passed (if applicable)'
        ],
        estimatedTime: '6 minutes'
      },
      {
        stepNumber: 7,
        title: 'Install Passenger Airbag Module',
        description: 'Handle airbag module (IP-AIRBAG-PASS) with ESD protection. Install into designated cavity and secure with 8 M6x20 bolts. Torque to 15 Nm ±2 Nm.',
        images: [],
        checkpoints: [
          'ESD protection used during handling',
          'Module properly seated in cavity',
          'All 8 bolts installed and torqued',
          'Torque values recorded: 13-17 Nm',
          'Airbag indicator light functional'
        ],
        estimatedTime: '8 minutes'
      },
      {
        stepNumber: 8,
        title: 'Final Inspection and Documentation',
        description: 'Perform visual inspection of completed assembly. Verify all checkpoints met. Record serial number and inspector signature.',
        images: [],
        checkpoints: [
          'No visible defects or damage',
          'All gaps within tolerance (≤0.5mm)',
          'All fasteners torqued and verified',
          'Serial number recorded',
          'Inspector signature obtained',
          'Work order completed in system'
        ],
        estimatedTime: '4 minutes'
      }
    ],

    // Details - Part Numbers, Defects, Reworks, Image Classes, Barcode Classes
    partNumbers: [
      { id: 1, number: 'P11-NDA1B4-05', order: 1 },
      { id: 2, number: 'P11-NDBLTW-01', order: 2 },
      { id: 3, number: 'P11-NDD1B4-05', order: 3 },
      { id: 4, number: 'P11-NDA1D4-05', order: 4 },
      { id: 5, number: 'P11-NDDGTV-01', order: 5 },
      { id: 6, number: 'P11-NDALTT-01', order: 6 }
    ],

    defects: [
      { id: 1, name: 'surface damaged', highFallout: false, order: 1 },
      { id: 2, name: 'missing components', highFallout: false, order: 2 },
      { id: 3, name: 'wrong label', highFallout: false, order: 3 },
      { id: 4, name: 'dents', highFallout: false, order: 4 },
      { id: 5, name: 'loose thread', highFallout: false, order: 5 },
      { id: 6, name: 'china marker marks', highFallout: false, order: 6 }
    ],

    reworks: [
      { id: 1, name: 'Re-torque fasteners', order: 1 },
      { id: 2, name: 'Replace damaged bezel', order: 2 },
      { id: 3, name: 'Clean adhesive residue', order: 3 },
      { id: 4, name: 'Realign panel gaps', order: 4 }
    ],

    imageClasses: [
      { id: 1, name: 'Class A - Critical Surface', order: 1 },
      { id: 2, name: 'Class B - Visible Surface', order: 2 },
      { id: 3, name: 'Class C - Hidden Surface', order: 3 }
    ],

    barcodeClasses: [
      { id: 1, name: 'Serial Number Barcode', order: 1 },
      { id: 2, name: 'Part Number Barcode', order: 2 },
      { id: 3, name: 'Lot Traceability Barcode', order: 3 }
    ],

    // Risk Assessments
    riskAssessments: [
      {
        id: 1,
        inspectionType: 'Adhesive Bond Strength',
        initialScore: 7,
        recommendedActions: 'Increase UV curing time from 90 seconds to 120 seconds. Verify lamp intensity weekly.',
        targetDate: '2024-02-15',
        actionsTaken: 'Updated work instruction with new curing time. Implemented lamp intensity calibration schedule.',
        revisedScore: 3,
        status: 'Approved',
        completedDate: '2024-02-10'
      },
      {
        id: 2,
        inspectionType: 'Airbag Deployment Risk',
        initialScore: 9,
        recommendedActions: 'Implement mandatory ESD wrist straps for all operators. Add warning labels to fixture.',
        targetDate: '2024-01-30',
        actionsTaken: 'ESD wrist straps now required and verified daily. Warning labels installed on all fixtures.',
        revisedScore: 2,
        status: 'Approved',
        completedDate: '2024-01-25'
      },
      {
        id: 3,
        inspectionType: 'Bezel Gap Measurement',
        initialScore: 5,
        recommendedActions: 'Replace manual calipers with digital calipers for all gap measurements. Train operators on proper measurement technique.',
        targetDate: '2024-03-01',
        actionsTaken: 'Digital calipers deployed to all workstations. Training completed for 15 operators.',
        revisedScore: 2,
        status: 'Approved',
        completedDate: '2024-02-28'
      }
    ],

    // Process Audits
    processAudits: [
      {
        id: 1,
        shiftDate: '2024-10-15',
        shift: 'Shift 1',
        inspectorEmployee: 'Jose Alberto Tirado Beltran',
        partNumber: 'P11-NDA1G4-06',
        comments: '',

        // Team Member Observation
        teamMemberObservation: [
          { question: 'Is the Team Member in the correct station?', result: 'Pass' },
          { question: 'Is team member in proper dress code? (Black dickie style work pants, Shirt, Safety Vest, Hat)', result: 'Pass' },
          { question: 'Does Team Member have on proper PPE?', result: 'Pass' },
          { question: 'Is the Team Member distracted from performing duties?', result: 'Pass' },
          { question: 'Is Team Member leaning or sitting down at their work station?', result: 'Pass' },
          { question: 'Does Team Member know the Quality Policy or where it is located?', result: 'Pass' }
        ],
        teamMemberObservationNotes: '',

        // Quality System Process Observation
        qualitySystemObservation: [
          { question: 'Is there a clear Identification method available to check the parts being inspected?', result: 'Pass' },
          { question: 'Does the Label Part Number / Part Name / Part Color / Part Description / Part Quantity match product/parts packaging?', result: 'Pass' },
          { question: 'Are all materials within the inspection area properly labeled and identified?', result: 'Pass' },
          { question: 'Does the Work Instruction define a clear Process Flow? Including use of identification placards?', result: 'Pass' },
          { question: 'Do the Work Instructions provided in the project book or on the scanner reflect the current Revision Level in Nexus?', result: 'Pass' },
          { question: 'Is the Team Member following the Work Instructions and/or Quality Alert step by step as it is written?', result: 'Pass' },
          { question: 'Is the witness mark being placed in the proper location per the Work Instructions?', result: 'Pass' },
          { question: 'Are the certified parts being repackaged correctly according to how received and by directions in Work Instruction?', result: 'Pass' },
          { question: 'Are the Non-Conforming parts being packaged correctly according to how received and by directions in Work Instruction?', result: 'Pass' },
          { question: 'Have Rejected parts been properly labeled and segregated as non-conforming material?', result: 'Pass' },
          { question: 'Does the Work Instruction define a clear Escalation Path?', result: 'Pass' },
          { question: 'Are Green Certified Stickers/ Red, Yellow, or Green Placards being placed on product after inspection?', result: 'Pass' }
        ],
        qualitySystemObservationNotes: '',

        // Requirements/Tools/Asset Observations
        requirementsToolsObservation: [
          { question: 'Has a boundary sample been provided for conforming and non-conforming parts, and available for use during inspection?', result: 'Pass' },
          { question: 'Are proper Marking Devices and the proper color being used according to the Work Instructions?', result: 'Pass' },
          { question: 'Is Team Member using a Nexus Scanner? If so, is the scanner attached with a lanyard and attached to Team Member?', result: 'Pass' },
          { question: 'Are tools and/or gauges required for this job? If so, do the gauges have evidence of calibration?', result: 'Pass' },
          { question: 'Are proper tools being used according to the Work Instructions?', result: 'Pass' },
          { question: 'Are tools in proper working condition?', result: 'Pass' },
          { question: 'Is Injury & Illness Prevention Program Manual accessible to Team Members?', result: 'Pass' }
        ],
        requirementsToolsObservationNotes: '',

        // Work Area Observations
        workAreaObservation: [
          { question: 'Is work area free from the following: falling objects ,slips, trips or falls, machinery hazards,or any electrical hazards?', result: 'Pass' },
          { question: 'Is work area compliant with 5S standards?', result: 'Pass' },
          { question: 'Is lighting sufficient to perform sort activities?', result: 'Pass' },
          { question: 'Does the work area allow for comfortable performance of duties?', result: 'Pass' }
        ],
        workAreaObservationNotes: '',

        // Document Control Observations
        documentControlObservation: [
          { question: 'If Team Member is using a Nexus scanner are they logged in to the correct project number and shift?', result: 'Pass' },
          { question: 'If Nexus Scanner is not being used, is the Team Member using the correct Revision of the Tally Sheet for assigned project?', result: 'Pass' },
          { question: 'Is the Team Member filling Tally Sheet out correctly with Project Number, Part Number,Defect(s), Name, Date and Shift?', result: 'Pass' },
          { question: 'Is Team Member completing Chronological Log per day per shift?', result: 'Pass' },
          { question: 'Is Chronological Log being updated in Nexus under Job Overview daily?', result: 'Pass' },
          { question: 'Is Team Member signing Daily Inspector Checklist in Nexus daily per shift?', result: 'Pass' },
          { question: 'Are all documents legible and easy to read?', result: 'Pass' },
          { question: 'Has a Workplace Risk Assessment been completed in nexus for the Location?', result: 'Pass' },
          { question: 'Has a Risk Assessment been performed for this project?', result: 'Pass' },
          { question: 'Has Team Member read, been trained, understands, and signed off on Work Instructions and/or Quality Alert?', result: 'Pass' },
          { question: 'Has the Work Instructions been signed off by Work Instruction Approval Contact in Nexus?', result: 'Pass' },
          { question: 'Has the Work Instruction Training Acknowledgement been signed off by ALL Leadership and Team Members?', result: 'Pass' },
          { question: 'Are Daily Job Audits being completed for the project on every shift ran?', result: 'Pass' },
          { question: 'Is the customer signed WIRF for the current revision uploaded under the project documents?', result: 'Pass' },
          { question: 'Is Pre-shift meeting being completed for every working shift?', result: 'Pass' },
          { question: 'Has the project been addded to the location filing system?', result: 'Pass' },
          { question: 'Are project documents properly stored in the location filing system?', result: 'Pass' }
        ],
        documentControlObservationNotes: '',

        status: 'Approved',
        overallScore: 98,
        createdAt: '2024-10-15T10:30:00Z',
        updatedAt: '2024-10-15T14:00:00Z'
      }
    ],

    // Timeline
    timeline: [
      {
        id: 1,
        timestamp: '2024-01-10T09:00:00Z',
        user: 'Sarah Johnson',
        action: 'Work Instruction Created',
        details: 'Initial work instruction created for Model Y instrument panel assembly',
        icon: 'FileText'
      },
      {
        id: 2,
        timestamp: '2024-01-15T14:30:00Z',
        user: 'John Smith',
        action: 'Revision Updated',
        details: 'Updated from Rev 1 to Rev 2 - Added UV curing time specifications',
        icon: 'Edit'
      },
      {
        id: 3,
        timestamp: '2024-02-10T11:20:00Z',
        user: 'Sarah Johnson',
        action: 'Risk Assessment Completed',
        details: 'Adhesive bond strength risk assessment approved - Score reduced from 7 to 3',
        icon: 'Shield'
      },
      {
        id: 4,
        timestamp: '2024-02-28T16:45:00Z',
        user: 'Mike Chen',
        action: 'Process Improvement',
        details: 'Digital calipers deployed to replace manual calipers',
        icon: 'TrendingUp'
      },
      {
        id: 5,
        timestamp: '2024-03-05T10:00:00Z',
        user: 'Quality Manager',
        action: 'Revision Updated',
        details: 'Updated from Rev 2 to Rev 3 - Final approval for production use',
        icon: 'CheckCircle'
      },
      {
        id: 6,
        timestamp: '2024-10-15T13:30:00Z',
        user: 'Sarah Johnson',
        action: 'Process Audit Completed',
        details: 'Process audit performed on 1st shift - Score: 95% (1 minor finding)',
        icon: 'ClipboardCheck'
      }
    ],

    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-03-05T10:00:00Z',
    createdBy: 'Sarah Johnson',
    approvedBy: 'Quality Manager',
    approvedDate: '2024-03-05T10:00:00Z'
  },
  {
    id: 2,
    jobId: 1, // Faurecia - Instrument Panel Assembly
    name: 'Quality Inspection - Final Assembly',
    partNumber: 'IP-ASSY-2024-Y',
    revision: 'Rev 2',
    status: 'Approved',

    description: 'Final quality inspection procedure for completed instrument panel assemblies',
    purpose: 'Verify all quality standards are met before shipment to customer',
    scope: 'All completed Model Y instrument panels',

    equipment: ['CMM Machine', 'Digital Caliper', 'Visual Inspection Station', 'Functionality Test Rig'],
    materials: ['Inspection Checklist Forms', 'Pass/Fail Labels'],
    tools: ['Digital Caliper', 'Go/No-Go Gauges', 'Surface Finish Comparator'],
    safetyRequirements: [
      'Safety glasses required',
      'Do not power on test rig without proper training'
    ],
    qualityStandards: [
      'Zero defects policy for critical features',
      'Customer acceptance criteria per drawing',
      'ISO 9001:2015 inspection requirements'
    ],

    steps: [
      {
        stepNumber: 1,
        title: 'Visual Inspection',
        description: 'Inspect for scratches, dents, color mismatch, or any cosmetic defects',
        images: [],
        checkpoints: [
          'No scratches > 2mm in Class A surfaces',
          'Color matches standard sample',
          'No dents or deformation',
          'All labels present and legible'
        ],
        estimatedTime: '3 minutes'
      },
      {
        stepNumber: 2,
        title: 'Dimensional Verification',
        description: 'Measure critical dimensions using digital caliper and CMM',
        images: [],
        checkpoints: [
          'Overall dimensions within ±0.5mm',
          'Mounting hole positions verified',
          'Gap measurements recorded',
          'CMM report generated and saved'
        ],
        estimatedTime: '10 minutes'
      },
      {
        stepNumber: 3,
        title: 'Functional Testing',
        description: 'Test all electronic functions including cluster display and airbag indicator',
        images: [],
        checkpoints: [
          'Display powers on and shows all segments',
          'Airbag indicator functions correctly',
          'All electrical connections secure',
          'No error codes displayed'
        ],
        estimatedTime: '5 minutes'
      },
      {
        stepNumber: 4,
        title: 'Documentation and Labeling',
        description: 'Complete inspection report and apply pass label',
        images: [],
        checkpoints: [
          'Inspection report completed fully',
          'Inspector signature obtained',
          'Pass label applied in correct location',
          'Serial number recorded in database'
        ],
        estimatedTime: '2 minutes'
      }
    ],

    riskAssessments: [],
    processAudits: [],
    timeline: [
      {
        id: 1,
        timestamp: '2024-01-20T10:00:00Z',
        user: 'Sarah Johnson',
        action: 'Work Instruction Created',
        details: 'Quality inspection work instruction created',
        icon: 'FileText'
      },
      {
        id: 2,
        timestamp: '2024-02-01T09:00:00Z',
        user: 'Quality Manager',
        action: 'Approved',
        details: 'Work instruction approved for production use',
        icon: 'CheckCircle'
      }
    ],

    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-02-01T09:00:00Z',
    createdBy: 'Sarah Johnson',
    approvedBy: 'Quality Manager',
    approvedDate: '2024-02-01T09:00:00Z'
  },
  {
    id: 3,
    jobId: 2, // Nissan - Door Panel Manufacturing
    name: 'Door Panel Stamping Process',
    partNumber: 'DP-STAMP-SEN-2024',
    revision: 'Rev 1',
    status: 'Draft',

    description: 'Stamping process for Nissan Sentra door panel outer skin',
    purpose: 'Produce door panels meeting dimensional and cosmetic requirements',
    scope: 'All door panel stamping operations at Aguascalientes Plant',

    equipment: ['Stamping Press 500T', 'Die Set DP-001', 'Transfer Automation System'],
    materials: ['Steel Coil Grade 440MPa', 'Lubricant Type L-200'],
    tools: ['Die Maintenance Tools', 'Thickness Gauge', 'Surface Roughness Tester'],
    safetyRequirements: [
      'LOTO procedure mandatory for die changes',
      'Two-hand control operation required',
      'Safety curtains must be functional',
      'Hearing protection required in press area'
    ],
    qualityStandards: [
      'PPAP Level 3 required',
      'Cpk ≥ 1.67 for all critical dimensions',
      'Zero sharp edges or burrs'
    ],

    steps: [
      {
        stepNumber: 1,
        title: 'Setup and Die Verification',
        description: 'Install die set, verify alignment, and run initial setup parts',
        images: [],
        checkpoints: [
          'Die properly seated and secured',
          'Alignment verified with gauge blocks',
          'Coolant flow confirmed',
          'Setup parts measured and approved'
        ],
        estimatedTime: '45 minutes'
      },
      {
        stepNumber: 2,
        title: 'Production Run',
        description: 'Run production parts with continuous monitoring',
        images: [],
        checkpoints: [
          'Press speed at 12 SPM',
          'Transfer system functioning',
          'Parts stacking correctly',
          'No abnormal sounds or vibrations'
        ],
        estimatedTime: 'Continuous'
      },
      {
        stepNumber: 3,
        title: 'In-Process Inspection',
        description: 'Inspect parts every 50 pieces for dimensional compliance',
        images: [],
        checkpoints: [
          'Critical dimensions within tolerance',
          'Surface finish acceptable',
          'No cracks or splits',
          'Edge condition satisfactory'
        ],
        estimatedTime: '5 minutes per check'
      }
    ],

    riskAssessments: [
      {
        id: 1,
        inspectionType: 'Die Wear Monitoring',
        initialScore: 6,
        recommendedActions: 'Implement die wear monitoring system with sensors',
        targetDate: '2024-12-01',
        actionsTaken: '',
        revisedScore: null,
        status: 'In Progress',
        completedDate: null
      }
    ],
    processAudits: [],
    timeline: [
      {
        id: 1,
        timestamp: '2024-10-20T11:00:00Z',
        user: 'Carlos Martinez',
        action: 'Work Instruction Created',
        details: 'Draft work instruction created for door panel stamping',
        icon: 'FileText'
      }
    ],

    createdAt: '2024-10-20T11:00:00Z',
    updatedAt: '2024-10-20T11:00:00Z',
    createdBy: 'Carlos Martinez',
    approvedBy: null,
    approvedDate: null
  }
];

module.exports = workInstructions;
