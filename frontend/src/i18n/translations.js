// =====================================================
// ARCHIVO: frontend/src/i18n/translations.js
// Sistema de traducciones Inglés/Español - Quality Alert System
// =====================================================

export const translations = {
  en: {
    // =====================================================
    // COMMON - Elementos compartidos
    // =====================================================
    common: {
      loading: 'Loading...',
      loadingDashboard: 'Loading dashboard...',
      noData: 'No data available',
      error: 'An error occurred',
      success: 'Success',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
      all: 'All',
      none: 'None',
      search: 'Search',
      filter: 'Filter',
      filters: 'Filters',
      clear: 'Clear',
      reset: 'Reset',
      apply: 'Apply',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      first: 'First',
      last: 'Last',
      of: 'of',
      page: 'Page',
      rows: 'rows',
      showing: 'Showing',
      to: 'to',
      entries: 'entries',
      actions: 'Actions',
      status: 'Status',
      date: 'Date',
      time: 'Time',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      notes: 'Notes',
      comments: 'Comments',
      description: 'Description',
      details: 'Details',
      summary: 'Summary',
      total: 'Total',
      subtotal: 'Subtotal',
      quantity: 'Quantity',
      price: 'Price',
      cost: 'Cost',
      amount: 'Amount',
      percentage: 'Percentage',
      active: 'Active',
      inactive: 'Inactive',
      enabled: 'Enabled',
      disabled: 'Disabled',
      required: 'Required',
      optional: 'Optional',
      default: 'Default',
      custom: 'Custom',
      other: 'Other',
      unknown: 'Unknown',
      na: 'N/A',
      modules: 'Modules',
      configuration: 'Configuration',
      settings: 'Settings',
      preferences: 'Preferences',
      profile: 'Profile',
      account: 'Account',
      help: 'Help',
      about: 'About',
      version: 'Version',
      copyright: 'Copyright',
      refresh: 'Refresh',
      update: 'Update',
      retry: 'Retry',
      continue: 'Continue',
      finish: 'Finish',
      complete: 'Complete',
      incomplete: 'Incomplete',
      pending: 'Pending',
      inProgress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      failed: 'Failed',
      success: 'Success',
      warning: 'Warning',
      info: 'Information',
      tip: 'Tip',
      new: 'New',
      open: 'Open',
      closed: 'Closed',
      draft: 'Draft',
      published: 'Published',
      archived: 'Archived',
      deleted: 'Deleted',
      selected: 'Selected',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      expandAll: 'Expand All',
      collapseAll: 'Collapse All',
      showMore: 'Show More',
      showLess: 'Show Less',
      viewAll: 'View All',
      seeMore: 'See More',
      details: 'Details',
      overview: 'Overview',
      history: 'History',
      attachments: 'Attachments',
      files: 'Files',
      upload: 'Upload',
      download: 'Download',
      print: 'Print',
      share: 'Share',
      copy: 'Copy',
      paste: 'Paste',
      cut: 'Cut',
      duplicate: 'Duplicate',
      move: 'Move',
      rename: 'Rename',
      sort: 'Sort',
      sortBy: 'Sort by',
      groupBy: 'Group by',
      ascending: 'Ascending',
      descending: 'Descending',
      newest: 'Newest',
      oldest: 'Oldest',
      recent: 'Recent',
      popular: 'Popular',
      recommended: 'Recommended',
      featured: 'Featured',
      pinned: 'Pinned',
      favorite: 'Favorite',
      favorites: 'Favorites',
      bookmark: 'Bookmark',
      bookmarks: 'Bookmarks',
      tag: 'Tag',
      tags: 'Tags',
      category: 'Category',
      categories: 'Categories',
      type: 'Type',
      types: 'Types',
      priority: 'Priority',
      severity: 'Severity',
      level: 'Level',
      department: 'Department',
      area: 'Area',
      location: 'Location',
      shift: 'Shift',
      team: 'Team',
      user: 'User',
      users: 'Users',
      role: 'Role',
      roles: 'Roles',
      permission: 'Permission',
      permissions: 'Permissions',
      access: 'Access',
      admin: 'Admin',
      manager: 'Manager',
      supervisor: 'Supervisor',
      operator: 'Operator',
      inspector: 'Inspector',
      auditor: 'Auditor',
      technician: 'Technician',
      engineer: 'Engineer',
      analyst: 'Analyst',
      coordinator: 'Coordinator',
      director: 'Director',
      owner: 'Owner',
      assignedTo: 'Assigned to',
      createdBy: 'Created by',
      updatedBy: 'Updated by',
      approvedBy: 'Approved by',
      rejectedBy: 'Rejected by',
      closedBy: 'Closed by',
      createdAt: 'Created at',
      updatedAt: 'Updated at',
      startDate: 'Start Date',
      endDate: 'End Date',
      dueDate: 'Due Date',
      targetDate: 'Target Date',
      actualDate: 'Actual Date',
      plannedDate: 'Planned Date',
      scheduledDate: 'Scheduled Date',
      completedDate: 'Completed Date',
      today: 'Today',
      yesterday: 'Yesterday',
      tomorrow: 'Tomorrow',
      thisWeek: 'This Week',
      lastWeek: 'Last Week',
      nextWeek: 'Next Week',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
      nextMonth: 'Next Month',
      thisQuarter: 'This Quarter',
      thisYear: 'This Year',
      custom: 'Custom',
      from: 'From',
      to: 'To',
      between: 'Between',
      and: 'and',
      or: 'Or',
      days: 'days',
      hours: 'hours',
      minutes: 'minutes',
      seconds: 'seconds'
    },

    // Acciones CRUD
    actions: {
      create: 'Create',
      add: 'Add',
      edit: 'Edit',
      update: 'Update',
      save: 'Save',
      saveChanges: 'Save Changes',
      saveDraft: 'Save Draft',
      submit: 'Submit',
      cancel: 'Cancel',
      delete: 'Delete',
      remove: 'Remove',
      archive: 'Archive',
      restore: 'Restore',
      approve: 'Approve',
      reject: 'Reject',
      review: 'Review',
      assign: 'Assign',
      reassign: 'Reassign',
      escalate: 'Escalate',
      transfer: 'Transfer',
      view: 'View',
      preview: 'Preview',
      export: 'Export',
      import: 'Import',
      generate: 'Generate',
      send: 'Send',
      resend: 'Resend',
      notify: 'Notify',
      remind: 'Remind',
      schedule: 'Schedule',
      reschedule: 'Reschedule',
      start: 'Start',
      stop: 'Stop',
      pause: 'Pause',
      resume: 'Resume',
      execute: 'Execute',
      run: 'Run',
      process: 'Process',
      validate: 'Validate',
      verify: 'Verify',
      confirm: 'Confirm',
      acknowledge: 'Acknowledge',
      accept: 'Accept',
      decline: 'Decline',
      release: 'Release',
      publish: 'Publish',
      unpublish: 'Unpublish',
      lock: 'Lock',
      unlock: 'Unlock',
      enable: 'Enable',
      disable: 'Disable',
      activate: 'Activate',
      deactivate: 'Deactivate',
      configure: 'Configure',
      customize: 'Customize',
      manage: 'Manage',
      sync: 'Sync',
      refresh: 'Refresh',
      reload: 'Reload',
      reset: 'Reset',
      clear: 'Clear',
      undo: 'Undo',
      redo: 'Redo'
    },

    // Notificaciones
    notifications: {
      saved: 'Successfully saved',
      created: 'Successfully created',
      updated: 'Successfully updated',
      deleted: 'Successfully deleted',
      approved: 'Successfully approved',
      rejected: 'Successfully rejected',
      submitted: 'Successfully submitted',
      sent: 'Successfully sent',
      uploaded: 'Successfully uploaded',
      downloaded: 'Successfully downloaded',
      copied: 'Copied to clipboard',
      error: 'An error occurred',
      errorSaving: 'Error saving',
      errorLoading: 'Error loading data',
      errorDeleting: 'Error deleting',
      unauthorized: 'Unauthorized access',
      forbidden: 'Access forbidden',
      notFound: 'Not found',
      timeout: 'Request timeout',
      networkError: 'Network error',
      serverError: 'Server error',
      validationError: 'Validation error',
      requiredFields: 'Please fill in all required fields',
      invalidData: 'Invalid data',
      confirmDelete: 'Are you sure you want to delete this item?',
      confirmCancel: 'Are you sure you want to cancel? Unsaved changes will be lost.',
      noChanges: 'No changes to save',
      unsavedChanges: 'You have unsaved changes'
    },

    // Header y navegación
    header: {
      systemName: 'Quality Alert System',
      dashboard: 'Dashboard',
      welcome: 'Welcome',
      logout: 'Logout',
      login: 'Login',
      language: 'Language',
      theme: 'Theme',
      notifications: 'Notifications',
      messages: 'Messages',
      help: 'Help',
      settings: 'Settings',
      profile: 'Profile',
      account: 'Account',
      myAccount: 'My Account',
      changePassword: 'Change Password',
      signOut: 'Sign Out'
    },

    // Navegación de módulos
    nav: {
      home: 'Home',
      dashboard: 'Dashboard',
      modules: 'Modules',
      eightD: '8D Problem Solving',
      ecr: 'ECR',
      mrb: 'MRB',
      audits: 'Audits',
      qar: 'QAR',
      defects: 'Defects',
      skills: 'Skills',
      workInstructions: 'Work Instructions',
      lessonsLearned: 'Lessons Learned',
      users: 'Users',
      roles: 'Roles',
      departments: 'Departments',
      configuration: 'Configuration',
      reports: 'Reports',
      analytics: 'Analytics',
      admin: 'Administration'
    },

    // Roles y jerarquías
    roles: {
      Champion: 'Quality Director',
      Manager: 'Quality Manager',
      Engineer: 'Quality Engineer',
      Technician: 'Quality Technician',
      Admin: 'Administrator',
      Supervisor: 'Supervisor',
      Operator: 'Operator',
      Inspector: 'Inspector',
      Auditor: 'Auditor'
    },

    // Estados y severidad
    severity: {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      none: 'None'
    },

    // Tiempo presets
    timePresets: {
      today: 'Today',
      week: 'Week',
      currentMonth: 'Current Month',
      quarter: 'Quarter',
      year: 'Year',
      all: 'All'
    },

    // =====================================================
    // 8D - Problem Solving
    // =====================================================
    eightD: {
      title: '8D Problem Solving',
      dashboard: '8D Dashboard',
      problemSolvingAnalytics: 'Problem Solving Analytics',
      new8D: 'New 8D',
      consultation: 'Consultation',
      totalReports: 'Total 8D Reports',
      activeReports: 'Active Reports',
      closedReports: 'Closed Reports',
      overdueReports: 'Overdue Reports',
      highSeverity: 'High Severity',
      estimatedCost: 'Estimated Cost',
      steps: {
        D1: 'D1 - Team Formation',
        D2: 'D2 - Problem Description',
        D3: 'D3 - Containment Actions',
        D4: 'D4 - Root Cause Analysis',
        D5: 'D5 - Corrective Actions',
        D6: 'D6 - Implementation',
        D7: 'D7 - Prevention',
        D8: 'D8 - Team Recognition'
      },
      status: {
        'D1 - Team Formation': 'D1 - Team Formation',
        'D2 - Problem Description': 'D2 - Problem Description',
        'D3 - Containment': 'D3 - Containment Actions',
        'D4 - Root Cause Analysis': 'D4 - Root Cause Analysis',
        'D5 - Corrective Actions': 'D5 - Corrective Actions',
        'D6 - Implementation': 'D6 - Implementation',
        'D7 - Prevention': 'D7 - Prevention Actions',
        'D8 - Closed': 'D8 - Closed'
      },
      fields: {
        reportId: 'Report ID',
        title: 'Title',
        customer: 'Customer',
        partNumber: 'Part Number',
        dateOpened: 'Date Opened',
        targetClose: 'Target Close Date',
        teamLeader: 'Team Leader',
        assignedTo: 'Assigned To',
        description: 'Description',
        rootCause: 'Root Cause',
        containmentAction: 'Containment Action',
        correctiveAction: 'Corrective Action',
        preventiveAction: 'Preventive Action',
        verification: 'Verification',
        effectiveness: 'Effectiveness'
      },
      messages: {
        couldNotLoad: 'Could not load dashboard information.'
      }
    },

    // =====================================================
    // ECR - Engineering Change Request
    // =====================================================
    ecr: {
      title: 'Engineering Change Request',
      newEcr: 'New ECR',
      ecrList: 'ECR List',
      backToDashboard: 'Back to Dashboard',
      tabs: {
        team: 'Team',
        changeRequest: 'Change Request',
        impactAnalysis: 'Impact Analysis',
        validationPlan: 'Validation Plan',
        closure: 'Closure'
      },
      status: {
        draft: 'Draft',
        pending_approval: 'Pending Approval',
        approved: 'Approved',
        rejected: 'Rejected',
        in_progress: 'In Progress',
        completed: 'Completed',
        closed: 'Closed',
        closed_rejected: 'Closed (Rejected)'
      },
      team: {
        title: 'Team Assignment',
        reviewBoard: 'Review Board',
        primary: 'Primary Responsible',
        members: 'Members',
        validationTeams: 'Validation Teams',
        selectPrimary: 'Select primary responsible',
        selectMembers: 'Select team members',
        noUsersAvailable: 'No users available',
        tftTeam: 'TFT Team (Task Force Team)',
        department: 'Department'
      },
      changeRequest: {
        title: 'Change Request Details',
        changeType: 'Change Type',
        changeDescription: 'Change Description',
        justification: 'Justification',
        requestedBy: 'Requested By',
        requestDate: 'Request Date',
        priority: 'Priority',
        affectedParts: 'Affected Parts',
        affectedProcesses: 'Affected Processes',
        attachments: 'Attachments',
        uploadFiles: 'Upload Files',
        types: {
          design: 'Design Change',
          process: 'Process Change',
          material: 'Material Change',
          supplier: 'Supplier Change',
          tooling: 'Tooling Change',
          packaging: 'Packaging Change',
          other: 'Other'
        },
        priorities: {
          high: 'High',
          medium: 'Medium',
          low: 'Low',
          critical: 'Critical'
        }
      },
      impactAnalysis: {
        title: 'Impact Analysis',
        qualityImpact: 'Quality Impact',
        costImpact: 'Cost Impact',
        scheduleImpact: 'Schedule Impact',
        safetyImpact: 'Safety Impact',
        regulatoryImpact: 'Regulatory Impact',
        customerImpact: 'Customer Impact',
        riskAssessment: 'Risk Assessment',
        mitigationPlan: 'Mitigation Plan',
        affectedDocuments: 'Affected Documents',
        levels: {
          none: 'None',
          low: 'Low',
          medium: 'Medium',
          high: 'High',
          critical: 'Critical'
        }
      },
      validationPlan: {
        title: 'Validation Plan',
        validationActivities: 'Validation Activities',
        testPlan: 'Test Plan',
        acceptanceCriteria: 'Acceptance Criteria',
        responsibleTeam: 'Responsible Team',
        targetDate: 'Target Date',
        actualDate: 'Actual Date',
        status: 'Status',
        results: 'Results',
        addActivity: 'Add Activity',
        activityStatus: {
          pending: 'Pending',
          in_progress: 'In Progress',
          completed: 'Completed',
          failed: 'Failed',
          na: 'N/A'
        }
      },
      closure: {
        title: 'ECR Closure',
        summary: 'Change Summary',
        implementationDate: 'Implementation Date',
        effectiveDate: 'Effective Date',
        lessonsLearned: 'Lessons Learned',
        finalApproval: 'Final Approval',
        closureNotes: 'Closure Notes',
        closeEcr: 'Close ECR',
        rejectEcr: 'Reject ECR'
      },
      messages: {
        saved: 'ECR saved successfully',
        submitted: 'ECR submitted for approval',
        approved: 'ECR approved successfully',
        rejected: 'ECR rejected',
        closed: 'ECR closed successfully',
        error: 'An error occurred',
        confirmClose: 'Are you sure you want to close this ECR?',
        confirmReject: 'Are you sure you want to reject this ECR?',
        readOnlyMode: 'This ECR is closed and read-only',
        requiredFields: 'Please fill in all required fields',
        stageComplete: 'Stage completed',
        stageIncomplete: 'Stage incomplete'
      },
      actions: {
        save: 'Save',
        saveDraft: 'Save Draft',
        submit: 'Submit for Approval',
        approve: 'Approve',
        reject: 'Reject',
        edit: 'Edit',
        delete: 'Delete',
        cancel: 'Cancel',
        next: 'Next',
        previous: 'Previous',
        complete: 'Complete',
        print: 'Print',
        export: 'Export PDF'
      },
      fields: {
        ecrNumber: 'ECR Number',
        revision: 'Revision',
        createdBy: 'Created By',
        createdAt: 'Created At',
        updatedAt: 'Last Updated',
        comments: 'Comments',
        history: 'History',
        attachments: 'Attachments'
      }
    },

    // =====================================================
    // MRB - Material Review Board
    // =====================================================
    mrb: {
      title: 'Material Review Board',
      dashboard: 'MRB Dashboard',
      newCampaign: 'New Campaign',
      campaigns: 'Campaigns',
      buffer: 'Buffer',
      shiftReport: 'Shift Report',
      defectCapture: 'Defect Capture',
      configuration: 'Configuration',

      // KPIs
      kpi: {
        yield: 'Yield',
        yieldPercent: 'Yield %',
        ppm: 'PPM',
        totalCost: 'Total Cost',
        backlog: 'Backlog',
        closed: 'Closed',
        scrap: 'Scrap (pcs)',
        rework: 'Rework (pcs)',
        useAsIs: 'Use As-Is (pcs)',
        return: 'Return (pcs)',
        hold: 'Hold (pcs)',
        avgResponse: 'Avg Response (days)',
        avgClosure: 'Avg Closure (days)',
        leadTime: 'Lead Time (days)',
        aging14: '>14 days open',
        aging30: '>30 days open',
        scrapCost: 'Scrap Cost',
        laborCost: 'Labor Cost',
        piecesPerHour: 'Pieces / Hour',
        defectsPerHour: 'Defects / Hour',
        downtime: 'Total Downtime',
        inspectorHours: 'Inspector Hours'
      },

      // Categorías de widgets
      categories: {
        summary: 'Summary',
        material: 'Material',
        timeFlow: 'Time & Flow',
        costImpact: 'Cost & Impact',
        defectsCause: 'Defects & Cause',
        operation: 'Operation'
      },

      // Widgets
      widgets: {
        campaignsPerMonth: 'Campaigns per Month / Dept',
        costPerMonth: 'Cost per Month',
        costPerMonthSummary: 'Cost per Month (Summary)',
        deptContribution: 'Department Contribution',
        openCampaigns: 'Open Campaigns',
        dispositionDistribution: 'Disposition Distribution',
        scrapReworkMonth: 'Scrap/Rework per Month',
        dispositionByDept: 'Disposition by Dept',
        campaignAging: 'Campaign Aging',
        costByDept: 'Cost by Dept',
        top10Cost: 'Top 10 Campaigns by Cost',
        topDefects: 'Top Defects',
        bySeverity: 'By Severity',
        nokByStage: 'NOK by Stage',
        nokByDept: 'NOK by Dept',
        downtimeByShift: 'Downtime by Shift',
        downtimeByDept: 'Downtime by Dept'
      },

      // Disposiciones
      disposition: {
        scrap: 'Scrap',
        rework: 'Rework',
        useAsIs: 'Use As-Is',
        return: 'Return to Supplier',
        hold: 'Hold',
        sortInspect: 'Sort/Inspect'
      },

      // Estados
      status: {
        open: 'Open',
        inProgress: 'In Progress',
        pendingDisposition: 'Pending Disposition',
        closed: 'Closed',
        cancelled: 'Cancelled'
      },

      // Campos
      fields: {
        campaignId: 'Campaign ID',
        partNumber: 'Part Number',
        partName: 'Part Name',
        defectType: 'Defect Type',
        quantity: 'Quantity',
        inspectedQty: 'Inspected Qty',
        defectiveQty: 'Defective Qty',
        severity: 'Severity',
        department: 'Department',
        area: 'Area',
        line: 'Line',
        shift: 'Shift',
        inspector: 'Inspector',
        dateCreated: 'Date Created',
        dateClosed: 'Date Closed',
        estimatedCost: 'Estimated Cost',
        actualCost: 'Actual Cost',
        rootCause: 'Root Cause',
        correctiveAction: 'Corrective Action'
      },

      // Mensajes
      messages: {
        qualityInspection: 'Quality Inspection',
        totalPieces: 'total pieces',
        totalInspected: 'pcs inspected'
      },

      // Presets de tiempo
      presets: {
        today: 'Today',
        week: 'Week',
        currentMonth: 'Current Month',
        quarter: 'Quarter',
        year: 'Year',
        all: 'All'
      }
    },

    // =====================================================
    // AUDIT - Auditorías
    // =====================================================
    audit: {
      title: 'Audit Management',
      dashboard: 'Audit Dashboard',
      programs: 'Audit Programs',
      checklists: 'Checklists',
      auditors: 'Auditors',
      calendar: 'Calendar',
      requests: 'Audit Requests',
      nonConformities: 'Non-Conformities',
      ncList: 'NC List',

      // KPIs
      kpi: {
        totalAudits: 'Total Audits',
        completedAudits: 'Completed',
        plannedAudits: 'Planned',
        inProgressAudits: 'In Progress',
        openNCs: 'Open NCs',
        closedNCs: 'Closed NCs',
        majorNCs: 'Major NCs',
        minorNCs: 'Minor NCs',
        observations: 'Observations',
        complianceRate: 'Compliance Rate',
        avgClosureTime: 'Avg Closure Time'
      },

      // Estados de auditoría
      status: {
        planned: 'Planned',
        in_progress: 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled',
        postponed: 'Postponed'
      },

      // Estados de NC
      ncStatus: {
        open: 'Open',
        pending_verification: 'Pending Verification',
        closed: 'Closed',
        overdue: 'Overdue'
      },

      // Tipos de NC
      ncTypes: {
        major: 'Major',
        minor: 'Minor',
        observation: 'Observation'
      },

      // Tipos de auditoría
      types: {
        internal: 'Internal',
        external: 'External',
        supplier: 'Supplier',
        process: 'Process',
        product: 'Product',
        system: 'System',
        lpa: 'LPA (Layered Process Audit)',
        iatf: 'IATF 16949',
        iso: 'ISO 9001',
        customer: 'Customer'
      },

      // Campos
      fields: {
        auditId: 'Audit ID',
        auditType: 'Audit Type',
        auditScope: 'Scope',
        auditObjective: 'Objective',
        leadAuditor: 'Lead Auditor',
        auditTeam: 'Audit Team',
        auditee: 'Auditee',
        department: 'Department',
        process: 'Process',
        plannedDate: 'Planned Date',
        actualDate: 'Actual Date',
        duration: 'Duration',
        findings: 'Findings',
        conclusions: 'Conclusions',
        recommendations: 'Recommendations'
      },

      // NC Campos
      ncFields: {
        ncNumber: 'NC Number',
        finding: 'Finding',
        evidence: 'Evidence',
        clause: 'Clause/Requirement',
        rootCause: 'Root Cause',
        correctiveAction: 'Corrective Action',
        responsiblePerson: 'Responsible Person',
        dueDate: 'Due Date',
        closureDate: 'Closure Date',
        verificationEvidence: 'Verification Evidence'
      },

      // Tabs
      tabs: {
        overview: 'Overview',
        audits: 'Audits',
        ncs: 'Non-Conformities',
        schedule: 'Schedule',
        reports: 'Reports'
      },

      // Acciones
      actions: {
        scheduleAudit: 'Schedule Audit',
        startAudit: 'Start Audit',
        completeAudit: 'Complete Audit',
        createNC: 'Create NC',
        closeNC: 'Close NC',
        verifyNC: 'Verify NC',
        generateReport: 'Generate Report',
        exportPlan: 'Export Plan'
      },

      // Mensajes
      messages: {
        noAuditsPlanned: 'No audits planned',
        noOpenNCs: 'No open non-conformities',
        auditCompleted: 'Audit completed successfully',
        ncCreated: 'Non-conformity created',
        ncClosed: 'Non-conformity closed'
      },

      // Charts
      charts: {
        byStatus: 'Audits by Status',
        byType: 'NC by Type',
        trend: 'Audit Trend',
        compliance: 'Compliance Rate'
      }
    },

    // =====================================================
    // SKILLS - Matriz de Habilidades
    // =====================================================
    skills: {
      title: 'Skills Matrix',
      dashboard: 'Skills Dashboard',
      managerialView: 'Managerial view of skills module',
      myTeam: 'My Team',
      myProfile: 'My Profile',
      configuration: 'Configuration',
      evaluate: 'Evaluate',

      // KPIs
      kpi: {
        usersWithProfile: 'Users with Profile',
        completedEvaluations: 'Completed Evaluations',
        draftEvaluations: 'Draft Evaluations',
        expiringTraining: 'Expiring Training'
      },

      // Campos
      fields: {
        skill: 'Skill',
        category: 'Category',
        currentLevel: 'Current Level',
        targetLevel: 'Target Level',
        gap: 'Gap',
        evaluator: 'Evaluator',
        evaluationDate: 'Evaluation Date',
        expirationDate: 'Expiration Date',
        certification: 'Certification',
        training: 'Training',
        notes: 'Notes'
      },

      // Niveles
      levels: {
        notTrained: 'Not Trained',
        inTraining: 'In Training',
        canDoWithSupervision: 'Can do with supervision',
        canDoIndependently: 'Can do independently',
        canTrain: 'Can train others'
      },

      // Estados de evaluación
      evaluationStatus: {
        draft: 'Draft',
        submitted: 'Submitted',
        approved: 'Approved',
        rejected: 'Rejected',
        completed: 'Completed'
      },

      // Charts
      charts: {
        avgByCategory: 'Average by Category',
        evaluationStatus: 'Evaluation Status',
        topGaps: 'Top Skill Gaps',
        teamRadar: 'Team Radar'
      },

      // Acciones
      actions: {
        evaluate: 'Evaluate',
        viewProfile: 'View Profile',
        assignTraining: 'Assign Training',
        scheduleEvaluation: 'Schedule Evaluation',
        exportMatrix: 'Export Matrix'
      },

      // Mensajes
      messages: {
        noData: 'No data',
        noEvaluations: 'No evaluations',
        profileUpdated: 'Profile updated',
        evaluationSaved: 'Evaluation saved',
        trainingAssigned: 'Training assigned'
      }
    },

    // =====================================================
    // QAR - Quality Alert Request
    // =====================================================
    qar: {
      title: 'Quality Alert Request',
      dashboard: 'QAR Dashboard',
      newQar: 'New QAR',
      qarList: 'QAR List',

      // Estados
      status: {
        draft: 'Draft',
        open: 'Open',
        investigating: 'Investigating',
        containment: 'Containment',
        resolved: 'Resolved',
        closed: 'Closed',
        escalated: 'Escalated'
      },

      // Tipos
      types: {
        customer: 'Customer Complaint',
        internal: 'Internal Detection',
        supplier: 'Supplier Issue',
        process: 'Process Deviation',
        product: 'Product Non-Conformance'
      },

      // Campos
      fields: {
        qarNumber: 'QAR Number',
        alertType: 'Alert Type',
        originSource: 'Origin Source',
        affectedProduct: 'Affected Product',
        affectedQuantity: 'Affected Quantity',
        containedQuantity: 'Contained Quantity',
        defectDescription: 'Defect Description',
        immediateAction: 'Immediate Action',
        responsibleArea: 'Responsible Area',
        escalationLevel: 'Escalation Level'
      },

      // Acciones
      actions: {
        createAlert: 'Create Alert',
        escalate: 'Escalate',
        contain: 'Contain',
        investigate: 'Investigate',
        resolve: 'Resolve',
        close: 'Close'
      }
    },

    // =====================================================
    // DEFECTS - Captura de Defectos
    // =====================================================
    defects: {
      title: 'Defect Management',
      capture: 'Defect Capture',
      query: 'Defect Query',
      hospital: 'Defect Hospital',
      configuration: 'Configuration',
      admin: 'Administration',

      // Campos
      fields: {
        defectCode: 'Defect Code',
        defectType: 'Defect Type',
        defectCategory: 'Category',
        location: 'Location',
        severity: 'Severity',
        quantity: 'Quantity',
        partNumber: 'Part Number',
        serialNumber: 'Serial Number',
        station: 'Station',
        operator: 'Operator',
        shift: 'Shift',
        captureDate: 'Capture Date',
        description: 'Description',
        image: 'Image',
        disposition: 'Disposition'
      },

      // Disposiciones
      disposition: {
        scrap: 'Scrap',
        rework: 'Rework',
        useAsIs: 'Use As-Is',
        returnSupplier: 'Return to Supplier',
        hold: 'Hold',
        reInspect: 'Re-Inspect'
      },

      // Mensajes
      messages: {
        defectCaptured: 'Defect captured successfully',
        noDefects: 'No defects found',
        scanPart: 'Scan or enter part number'
      }
    },

    // =====================================================
    // USERS - Gestión de Usuarios
    // =====================================================
    users: {
      title: 'User Management',
      newUser: 'New User',
      userList: 'User List',
      roles: 'Roles',
      departments: 'Departments',
      permissions: 'Permissions',

      // Campos
      fields: {
        username: 'Username',
        email: 'Email',
        firstName: 'First Name',
        lastName: 'Last Name',
        fullName: 'Full Name',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        role: 'Role',
        department: 'Department',
        position: 'Position',
        employeeNumber: 'Employee Number',
        phone: 'Phone',
        status: 'Status',
        lastLogin: 'Last Login',
        createdAt: 'Created At'
      },

      // Estados
      status: {
        active: 'Active',
        inactive: 'Inactive',
        pending: 'Pending',
        blocked: 'Blocked'
      },

      // Acciones
      actions: {
        createUser: 'Create User',
        editUser: 'Edit User',
        deleteUser: 'Delete User',
        resetPassword: 'Reset Password',
        assignRole: 'Assign Role',
        activateUser: 'Activate User',
        deactivateUser: 'Deactivate User'
      },

      // Mensajes
      messages: {
        userCreated: 'User created successfully',
        userUpdated: 'User updated successfully',
        userDeleted: 'User deleted successfully',
        passwordReset: 'Password reset successfully',
        invalidCredentials: 'Invalid credentials',
        userExists: 'User already exists'
      }
    },

    // =====================================================
    // HOME - Página Principal
    // =====================================================
    home: {
      title: 'Quality Management System',
      subtitle: 'Integrated platform for quality control and continuous improvement',
      selectModule: 'Select a module to begin',
      recentActivity: 'Recent Activity',
      quickAccess: 'Quick Access',
      pendingTasks: 'Pending Tasks',
      systemStatus: 'System Status',
      moduleDescriptions: {
        eightD: 'Structured problem solving methodology',
        ecr: 'Engineering change management',
        mrb: 'Material review and disposition',
        audit: 'Internal and external audit management',
        qar: 'Quality alerts and containment',
        defects: 'Defect capture and tracking',
        skills: 'Personnel skill matrix',
        wi: 'Work instructions management'
      }
    },

    // =====================================================
    // CONFIGURATION - Configuración
    // =====================================================
    config: {
      title: 'Configuration',
      general: 'General',
      system: 'System',
      modules: 'Modules',
      integrations: 'Integrations',
      notifications: 'Notifications',
      backup: 'Backup',
      audit: 'Audit Log',

      // Secciones
      sections: {
        company: 'Company Information',
        locale: 'Language & Region',
        theme: 'Theme & Appearance',
        email: 'Email Settings',
        security: 'Security',
        workflow: 'Workflow',
        reports: 'Reports'
      },

      // Campos
      fields: {
        companyName: 'Company Name',
        logo: 'Logo',
        timezone: 'Timezone',
        dateFormat: 'Date Format',
        language: 'Language',
        currency: 'Currency',
        smtpServer: 'SMTP Server',
        smtpPort: 'SMTP Port',
        sessionTimeout: 'Session Timeout',
        passwordPolicy: 'Password Policy'
      }
    },

    // =====================================================
    // WORK INSTRUCTIONS
    // =====================================================
    workInstructions: {
      title: 'Work Instructions',
      newInstruction: 'New Instruction',
      list: 'Instructions List',
      operatorProfile: 'Operator Profile',

      // Campos
      fields: {
        wiNumber: 'WI Number',
        title: 'Title',
        revision: 'Revision',
        process: 'Process',
        station: 'Station',
        effectiveDate: 'Effective Date',
        author: 'Author',
        approver: 'Approver',
        content: 'Content',
        safetyNotes: 'Safety Notes',
        qualityPoints: 'Quality Points'
      },

      // Estados
      status: {
        draft: 'Draft',
        pendingApproval: 'Pending Approval',
        approved: 'Approved',
        obsolete: 'Obsolete'
      }
    },

    // =====================================================
    // LESSONS LEARNED
    // =====================================================
    lessonsLearned: {
      title: 'Lessons Learned',
      newLesson: 'New Lesson',
      library: 'Lessons Library',

      // Campos
      fields: {
        lessonId: 'Lesson ID',
        title: 'Title',
        category: 'Category',
        source: 'Source',
        problem: 'Problem/Situation',
        solution: 'Solution/Best Practice',
        benefit: 'Benefit/Impact',
        applicability: 'Applicability',
        keywords: 'Keywords'
      },

      // Categorías
      categories: {
        quality: 'Quality',
        process: 'Process',
        safety: 'Safety',
        equipment: 'Equipment',
        supplier: 'Supplier',
        customer: 'Customer'
      }
    }
  },

  // =====================================================
  // ESPAÑOL
  // =====================================================
  es: {
    // =====================================================
    // COMMON - Elementos compartidos
    // =====================================================
    common: {
      loading: 'Cargando...',
      loadingDashboard: 'Cargando dashboard...',
      noData: 'No hay datos disponibles',
      error: 'Ocurrió un error',
      success: 'Éxito',
      confirm: 'Confirmar',
      yes: 'Sí',
      no: 'No',
      all: 'Todos',
      none: 'Ninguno',
      search: 'Buscar',
      filter: 'Filtrar',
      filters: 'Filtros',
      clear: 'Limpiar',
      reset: 'Restablecer',
      apply: 'Aplicar',
      close: 'Cerrar',
      back: 'Volver',
      next: 'Siguiente',
      previous: 'Anterior',
      first: 'Primero',
      last: 'Último',
      of: 'de',
      page: 'Página',
      rows: 'filas',
      showing: 'Mostrando',
      to: 'a',
      entries: 'registros',
      actions: 'Acciones',
      status: 'Estado',
      date: 'Fecha',
      time: 'Hora',
      name: 'Nombre',
      email: 'Correo',
      phone: 'Teléfono',
      address: 'Dirección',
      notes: 'Notas',
      comments: 'Comentarios',
      description: 'Descripción',
      details: 'Detalles',
      summary: 'Resumen',
      total: 'Total',
      subtotal: 'Subtotal',
      quantity: 'Cantidad',
      price: 'Precio',
      cost: 'Costo',
      amount: 'Monto',
      percentage: 'Porcentaje',
      active: 'Activo',
      inactive: 'Inactivo',
      enabled: 'Habilitado',
      disabled: 'Deshabilitado',
      required: 'Requerido',
      optional: 'Opcional',
      default: 'Predeterminado',
      custom: 'Personalizado',
      other: 'Otro',
      unknown: 'Desconocido',
      na: 'N/A',
      modules: 'Módulos',
      configuration: 'Configuración',
      settings: 'Ajustes',
      preferences: 'Preferencias',
      profile: 'Perfil',
      account: 'Cuenta',
      help: 'Ayuda',
      about: 'Acerca de',
      version: 'Versión',
      copyright: 'Derechos de autor',
      refresh: 'Actualizar',
      update: 'Actualizar',
      retry: 'Reintentar',
      continue: 'Continuar',
      finish: 'Finalizar',
      complete: 'Completar',
      incomplete: 'Incompleto',
      pending: 'Pendiente',
      inProgress: 'En Progreso',
      completed: 'Completado',
      cancelled: 'Cancelado',
      failed: 'Fallido',
      success: 'Éxito',
      warning: 'Advertencia',
      info: 'Información',
      tip: 'Consejo',
      new: 'Nuevo',
      open: 'Abierto',
      closed: 'Cerrado',
      draft: 'Borrador',
      published: 'Publicado',
      archived: 'Archivado',
      deleted: 'Eliminado',
      selected: 'Seleccionado',
      selectAll: 'Seleccionar Todo',
      deselectAll: 'Deseleccionar Todo',
      expandAll: 'Expandir Todo',
      collapseAll: 'Contraer Todo',
      showMore: 'Mostrar Más',
      showLess: 'Mostrar Menos',
      viewAll: 'Ver Todo',
      seeMore: 'Ver Más',
      overview: 'Vista General',
      history: 'Historial',
      attachments: 'Adjuntos',
      files: 'Archivos',
      upload: 'Subir',
      download: 'Descargar',
      print: 'Imprimir',
      share: 'Compartir',
      copy: 'Copiar',
      paste: 'Pegar',
      cut: 'Cortar',
      duplicate: 'Duplicar',
      move: 'Mover',
      rename: 'Renombrar',
      sort: 'Ordenar',
      sortBy: 'Ordenar por',
      groupBy: 'Agrupar por',
      ascending: 'Ascendente',
      descending: 'Descendente',
      newest: 'Más Reciente',
      oldest: 'Más Antiguo',
      recent: 'Reciente',
      popular: 'Popular',
      recommended: 'Recomendado',
      featured: 'Destacado',
      pinned: 'Fijado',
      favorite: 'Favorito',
      favorites: 'Favoritos',
      bookmark: 'Marcador',
      bookmarks: 'Marcadores',
      tag: 'Etiqueta',
      tags: 'Etiquetas',
      category: 'Categoría',
      categories: 'Categorías',
      type: 'Tipo',
      types: 'Tipos',
      priority: 'Prioridad',
      severity: 'Severidad',
      level: 'Nivel',
      department: 'Departamento',
      area: 'Área',
      location: 'Ubicación',
      shift: 'Turno',
      team: 'Equipo',
      user: 'Usuario',
      users: 'Usuarios',
      role: 'Rol',
      roles: 'Roles',
      permission: 'Permiso',
      permissions: 'Permisos',
      access: 'Acceso',
      admin: 'Administrador',
      manager: 'Gerente',
      supervisor: 'Supervisor',
      operator: 'Operador',
      inspector: 'Inspector',
      auditor: 'Auditor',
      technician: 'Técnico',
      engineer: 'Ingeniero',
      analyst: 'Analista',
      coordinator: 'Coordinador',
      director: 'Director',
      owner: 'Propietario',
      assignedTo: 'Asignado a',
      createdBy: 'Creado por',
      updatedBy: 'Actualizado por',
      approvedBy: 'Aprobado por',
      rejectedBy: 'Rechazado por',
      closedBy: 'Cerrado por',
      createdAt: 'Creado el',
      updatedAt: 'Actualizado el',
      startDate: 'Fecha Inicio',
      endDate: 'Fecha Fin',
      dueDate: 'Fecha Límite',
      targetDate: 'Fecha Objetivo',
      actualDate: 'Fecha Real',
      plannedDate: 'Fecha Planeada',
      scheduledDate: 'Fecha Programada',
      completedDate: 'Fecha Completado',
      today: 'Hoy',
      yesterday: 'Ayer',
      tomorrow: 'Mañana',
      thisWeek: 'Esta Semana',
      lastWeek: 'Semana Pasada',
      nextWeek: 'Próxima Semana',
      thisMonth: 'Este Mes',
      lastMonth: 'Mes Pasado',
      nextMonth: 'Próximo Mes',
      thisQuarter: 'Este Trimestre',
      thisYear: 'Este Año',
      from: 'Desde',
      to: 'Hasta',
      between: 'Entre',
      and: 'y',
      or: 'O',
      days: 'días',
      hours: 'horas',
      minutes: 'minutos',
      seconds: 'segundos'
    },

    // Acciones CRUD
    actions: {
      create: 'Crear',
      add: 'Agregar',
      edit: 'Editar',
      update: 'Actualizar',
      save: 'Guardar',
      saveChanges: 'Guardar Cambios',
      saveDraft: 'Guardar Borrador',
      submit: 'Enviar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      remove: 'Quitar',
      archive: 'Archivar',
      restore: 'Restaurar',
      approve: 'Aprobar',
      reject: 'Rechazar',
      review: 'Revisar',
      assign: 'Asignar',
      reassign: 'Reasignar',
      escalate: 'Escalar',
      transfer: 'Transferir',
      view: 'Ver',
      preview: 'Vista Previa',
      export: 'Exportar',
      import: 'Importar',
      generate: 'Generar',
      send: 'Enviar',
      resend: 'Reenviar',
      notify: 'Notificar',
      remind: 'Recordar',
      schedule: 'Programar',
      reschedule: 'Reprogramar',
      start: 'Iniciar',
      stop: 'Detener',
      pause: 'Pausar',
      resume: 'Reanudar',
      execute: 'Ejecutar',
      run: 'Ejecutar',
      process: 'Procesar',
      validate: 'Validar',
      verify: 'Verificar',
      confirm: 'Confirmar',
      acknowledge: 'Reconocer',
      accept: 'Aceptar',
      decline: 'Rechazar',
      release: 'Liberar',
      publish: 'Publicar',
      unpublish: 'Despublicar',
      lock: 'Bloquear',
      unlock: 'Desbloquear',
      enable: 'Habilitar',
      disable: 'Deshabilitar',
      activate: 'Activar',
      deactivate: 'Desactivar',
      configure: 'Configurar',
      customize: 'Personalizar',
      manage: 'Administrar',
      sync: 'Sincronizar',
      refresh: 'Actualizar',
      reload: 'Recargar',
      reset: 'Restablecer',
      clear: 'Limpiar',
      undo: 'Deshacer',
      redo: 'Rehacer'
    },

    // Notificaciones
    notifications: {
      saved: 'Guardado exitosamente',
      created: 'Creado exitosamente',
      updated: 'Actualizado exitosamente',
      deleted: 'Eliminado exitosamente',
      approved: 'Aprobado exitosamente',
      rejected: 'Rechazado exitosamente',
      submitted: 'Enviado exitosamente',
      sent: 'Enviado exitosamente',
      uploaded: 'Subido exitosamente',
      downloaded: 'Descargado exitosamente',
      copied: 'Copiado al portapapeles',
      error: 'Ocurrió un error',
      errorSaving: 'Error al guardar',
      errorLoading: 'Error al cargar datos',
      errorDeleting: 'Error al eliminar',
      unauthorized: 'Acceso no autorizado',
      forbidden: 'Acceso prohibido',
      notFound: 'No encontrado',
      timeout: 'Tiempo de espera agotado',
      networkError: 'Error de red',
      serverError: 'Error del servidor',
      validationError: 'Error de validación',
      requiredFields: 'Por favor complete todos los campos requeridos',
      invalidData: 'Datos inválidos',
      confirmDelete: '¿Está seguro que desea eliminar este elemento?',
      confirmCancel: '¿Está seguro que desea cancelar? Los cambios no guardados se perderán.',
      noChanges: 'No hay cambios para guardar',
      unsavedChanges: 'Tiene cambios sin guardar'
    },

    // Header y navegación
    header: {
      systemName: 'Sistema de Alertas de Calidad',
      dashboard: 'Dashboard',
      welcome: 'Bienvenido',
      logout: 'Cerrar Sesión',
      login: 'Iniciar Sesión',
      language: 'Idioma',
      theme: 'Tema',
      notifications: 'Notificaciones',
      messages: 'Mensajes',
      help: 'Ayuda',
      settings: 'Configuración',
      profile: 'Perfil',
      account: 'Cuenta',
      myAccount: 'Mi Cuenta',
      changePassword: 'Cambiar Contraseña',
      signOut: 'Salir'
    },

    // Navegación de módulos
    nav: {
      home: 'Inicio',
      dashboard: 'Dashboard',
      modules: 'Módulos',
      eightD: '8D Solución de Problemas',
      ecr: 'ECR',
      mrb: 'MRB',
      audits: 'Auditorías',
      qar: 'QAR',
      defects: 'Defectos',
      skills: 'Habilidades',
      workInstructions: 'Instrucciones de Trabajo',
      lessonsLearned: 'Lecciones Aprendidas',
      users: 'Usuarios',
      roles: 'Roles',
      departments: 'Departamentos',
      configuration: 'Configuración',
      reports: 'Reportes',
      analytics: 'Analíticas',
      admin: 'Administración'
    },

    // Roles y jerarquías
    roles: {
      Champion: 'Director de Calidad',
      Manager: 'Gerente de Calidad',
      Engineer: 'Ingeniero de Calidad',
      Technician: 'Técnico de Calidad',
      Admin: 'Administrador',
      Supervisor: 'Supervisor',
      Operator: 'Operador',
      Inspector: 'Inspector',
      Auditor: 'Auditor'
    },

    // Estados y severidad
    severity: {
      critical: 'Crítico',
      high: 'Alta',
      medium: 'Media',
      low: 'Baja',
      none: 'Ninguna'
    },

    // Tiempo presets
    timePresets: {
      today: 'Hoy',
      week: 'Semana',
      currentMonth: 'Mes actual',
      quarter: 'Trimestre',
      year: 'Año',
      all: 'Todo'
    },

    // =====================================================
    // 8D - Solución de Problemas
    // =====================================================
    eightD: {
      title: '8D Solución de Problemas',
      dashboard: 'Dashboard 8D',
      problemSolvingAnalytics: 'Análisis de Solución de Problemas',
      new8D: 'Nuevo 8D',
      consultation: 'Consulta',
      totalReports: 'Total Reportes 8D',
      activeReports: 'Reportes Activos',
      closedReports: 'Reportes Cerrados',
      overdueReports: 'Reportes Vencidos',
      highSeverity: 'Severidad Alta',
      estimatedCost: 'Costo Estimado',
      steps: {
        D1: 'D1 - Formación del Equipo',
        D2: 'D2 - Descripción del Problema',
        D3: 'D3 - Acciones de Contención',
        D4: 'D4 - Análisis de Causa Raíz',
        D5: 'D5 - Acciones Correctivas',
        D6: 'D6 - Implementación',
        D7: 'D7 - Prevención',
        D8: 'D8 - Reconocimiento del Equipo'
      },
      status: {
        'D1 - Team Formation': 'D1 - Formación del Equipo',
        'D2 - Problem Description': 'D2 - Descripción del Problema',
        'D3 - Containment': 'D3 - Acciones de Contención',
        'D4 - Root Cause Analysis': 'D4 - Análisis de Causa Raíz',
        'D5 - Corrective Actions': 'D5 - Acciones Correctivas',
        'D6 - Implementation': 'D6 - Implementación',
        'D7 - Prevention': 'D7 - Acciones Preventivas',
        'D8 - Closed': 'D8 - Cerrado'
      },
      fields: {
        reportId: 'ID del Reporte',
        title: 'Título',
        customer: 'Cliente',
        partNumber: 'Número de Parte',
        dateOpened: 'Fecha de Apertura',
        targetClose: 'Fecha Meta de Cierre',
        teamLeader: 'Líder del Equipo',
        assignedTo: 'Asignado A',
        description: 'Descripción',
        rootCause: 'Causa Raíz',
        containmentAction: 'Acción de Contención',
        correctiveAction: 'Acción Correctiva',
        preventiveAction: 'Acción Preventiva',
        verification: 'Verificación',
        effectiveness: 'Efectividad'
      },
      messages: {
        couldNotLoad: 'No se pudo cargar la información del dashboard.'
      }
    },

    // =====================================================
    // ECR - Solicitud de Cambio de Ingeniería
    // =====================================================
    ecr: {
      title: 'Solicitud de Cambio de Ingeniería',
      newEcr: 'Nuevo ECR',
      ecrList: 'Lista de ECRs',
      backToDashboard: 'Volver al Dashboard',
      tabs: {
        team: 'Equipo',
        changeRequest: 'Solicitud de Cambio',
        impactAnalysis: 'Análisis de Impacto',
        validationPlan: 'Plan de Validación',
        closure: 'Cierre'
      },
      status: {
        draft: 'Borrador',
        pending_approval: 'Pendiente de Aprobación',
        approved: 'Aprobado',
        rejected: 'Rechazado',
        in_progress: 'En Progreso',
        completed: 'Completado',
        closed: 'Cerrado',
        closed_rejected: 'Cerrado (Rechazado)'
      },
      team: {
        title: 'Asignación de Equipo',
        reviewBoard: 'Junta de Revisión',
        primary: 'Responsable Principal',
        members: 'Miembros',
        validationTeams: 'Equipos de Validación',
        selectPrimary: 'Seleccionar responsable principal',
        selectMembers: 'Seleccionar miembros del equipo',
        noUsersAvailable: 'No hay usuarios disponibles',
        tftTeam: 'Equipo TFT (Task Force Team)',
        department: 'Departamento'
      },
      changeRequest: {
        title: 'Detalles de la Solicitud de Cambio',
        changeType: 'Tipo de Cambio',
        changeDescription: 'Descripción del Cambio',
        justification: 'Justificación',
        requestedBy: 'Solicitado Por',
        requestDate: 'Fecha de Solicitud',
        priority: 'Prioridad',
        affectedParts: 'Partes Afectadas',
        affectedProcesses: 'Procesos Afectados',
        attachments: 'Archivos Adjuntos',
        uploadFiles: 'Subir Archivos',
        types: {
          design: 'Cambio de Diseño',
          process: 'Cambio de Proceso',
          material: 'Cambio de Material',
          supplier: 'Cambio de Proveedor',
          tooling: 'Cambio de Herramental',
          packaging: 'Cambio de Empaque',
          other: 'Otro'
        },
        priorities: {
          high: 'Alta',
          medium: 'Media',
          low: 'Baja',
          critical: 'Crítica'
        }
      },
      impactAnalysis: {
        title: 'Análisis de Impacto',
        qualityImpact: 'Impacto en Calidad',
        costImpact: 'Impacto en Costo',
        scheduleImpact: 'Impacto en Cronograma',
        safetyImpact: 'Impacto en Seguridad',
        regulatoryImpact: 'Impacto Regulatorio',
        customerImpact: 'Impacto al Cliente',
        riskAssessment: 'Evaluación de Riesgos',
        mitigationPlan: 'Plan de Mitigación',
        affectedDocuments: 'Documentos Afectados',
        levels: {
          none: 'Ninguno',
          low: 'Bajo',
          medium: 'Medio',
          high: 'Alto',
          critical: 'Crítico'
        }
      },
      validationPlan: {
        title: 'Plan de Validación',
        validationActivities: 'Actividades de Validación',
        testPlan: 'Plan de Pruebas',
        acceptanceCriteria: 'Criterios de Aceptación',
        responsibleTeam: 'Equipo Responsable',
        targetDate: 'Fecha Objetivo',
        actualDate: 'Fecha Real',
        status: 'Estado',
        results: 'Resultados',
        addActivity: 'Agregar Actividad',
        activityStatus: {
          pending: 'Pendiente',
          in_progress: 'En Progreso',
          completed: 'Completado',
          failed: 'Fallido',
          na: 'N/A'
        }
      },
      closure: {
        title: 'Cierre de ECR',
        summary: 'Resumen del Cambio',
        implementationDate: 'Fecha de Implementación',
        effectiveDate: 'Fecha Efectiva',
        lessonsLearned: 'Lecciones Aprendidas',
        finalApproval: 'Aprobación Final',
        closureNotes: 'Notas de Cierre',
        closeEcr: 'Cerrar ECR',
        rejectEcr: 'Rechazar ECR'
      },
      messages: {
        saved: 'ECR guardado exitosamente',
        submitted: 'ECR enviado para aprobación',
        approved: 'ECR aprobado exitosamente',
        rejected: 'ECR rechazado',
        closed: 'ECR cerrado exitosamente',
        error: 'Ocurrió un error',
        confirmClose: '¿Está seguro que desea cerrar este ECR?',
        confirmReject: '¿Está seguro que desea rechazar este ECR?',
        readOnlyMode: 'Este ECR está cerrado y es de solo lectura',
        requiredFields: 'Por favor complete todos los campos requeridos',
        stageComplete: 'Etapa completada',
        stageIncomplete: 'Etapa incompleta'
      },
      actions: {
        save: 'Guardar',
        saveDraft: 'Guardar Borrador',
        submit: 'Enviar a Aprobación',
        approve: 'Aprobar',
        reject: 'Rechazar',
        edit: 'Editar',
        delete: 'Eliminar',
        cancel: 'Cancelar',
        next: 'Siguiente',
        previous: 'Anterior',
        complete: 'Completar',
        print: 'Imprimir',
        export: 'Exportar PDF'
      },
      fields: {
        ecrNumber: 'Número de ECR',
        revision: 'Revisión',
        createdBy: 'Creado Por',
        createdAt: 'Fecha de Creación',
        updatedAt: 'Última Actualización',
        comments: 'Comentarios',
        history: 'Historial',
        attachments: 'Archivos Adjuntos'
      }
    },

    // =====================================================
    // MRB - Material Review Board
    // =====================================================
    mrb: {
      title: 'Material Review Board',
      dashboard: 'Dashboard MRB',
      newCampaign: 'Nueva Campaña',
      campaigns: 'Campañas',
      buffer: 'Buffer',
      shiftReport: 'Reporte de Turno',
      defectCapture: 'Captura de Defectos',
      configuration: 'Configuración',

      // KPIs
      kpi: {
        yield: 'Yield',
        yieldPercent: 'Yield %',
        ppm: 'PPM',
        totalCost: 'Costo Total',
        backlog: 'Backlog',
        closed: 'Cerradas',
        scrap: 'Scrap (pzas)',
        rework: 'Retrabajo (pzas)',
        useAsIs: 'Usar Como Está (pzas)',
        return: 'Devolución (pzas)',
        hold: 'Retención (pzas)',
        avgResponse: 'Prom. Respuesta (días)',
        avgClosure: 'Prom. Cierre (días)',
        leadTime: 'Lead Time (días)',
        aging14: '>14 días abiertas',
        aging30: '>30 días abiertas',
        scrapCost: 'Costo Scrap',
        laborCost: 'Mano de Obra',
        piecesPerHour: 'Piezas / Hora',
        defectsPerHour: 'Defectos / Hora',
        downtime: 'Downtime Total',
        inspectorHours: 'Horas Inspector'
      },

      // Categorías de widgets
      categories: {
        summary: 'Resumen',
        material: 'Material',
        timeFlow: 'Tiempo & Flujo',
        costImpact: 'Costo & Impacto',
        defectsCause: 'Defectos & Causa',
        operation: 'Operación'
      },

      // Widgets
      widgets: {
        campaignsPerMonth: 'Campañas por Mes / Depto',
        costPerMonth: 'Costo por Mes',
        costPerMonthSummary: 'Costo por Mes (Resumen)',
        deptContribution: 'Contrib. por Departamento',
        openCampaigns: 'Campañas Abiertas',
        dispositionDistribution: 'Distribución Disposición',
        scrapReworkMonth: 'Scrap/Rework por Mes',
        dispositionByDept: 'Disposición por Depto',
        campaignAging: 'Aging de Campañas',
        costByDept: 'Costo por Depto',
        top10Cost: 'Top 10 Campañas por Costo',
        topDefects: 'Top Defectos',
        bySeverity: 'Por Severidad',
        nokByStage: 'NOK por Etapa',
        nokByDept: 'NOK por Depto',
        downtimeByShift: 'Downtime por Turno',
        downtimeByDept: 'Downtime por Depto'
      },

      // Disposiciones
      disposition: {
        scrap: 'Scrap',
        rework: 'Retrabajo',
        useAsIs: 'Usar Como Está',
        return: 'Devolver a Proveedor',
        hold: 'Retención',
        sortInspect: 'Sorteo/Inspección'
      },

      // Estados
      status: {
        open: 'Abierta',
        inProgress: 'En Progreso',
        pendingDisposition: 'Pendiente Disposición',
        closed: 'Cerrada',
        cancelled: 'Cancelada'
      },

      // Campos
      fields: {
        campaignId: 'ID Campaña',
        partNumber: 'Número de Parte',
        partName: 'Nombre de Parte',
        defectType: 'Tipo de Defecto',
        quantity: 'Cantidad',
        inspectedQty: 'Cant. Inspeccionada',
        defectiveQty: 'Cant. Defectuosa',
        severity: 'Severidad',
        department: 'Departamento',
        area: 'Área',
        line: 'Línea',
        shift: 'Turno',
        inspector: 'Inspector',
        dateCreated: 'Fecha Creación',
        dateClosed: 'Fecha Cierre',
        estimatedCost: 'Costo Estimado',
        actualCost: 'Costo Real',
        rootCause: 'Causa Raíz',
        correctiveAction: 'Acción Correctiva'
      },

      // Mensajes
      messages: {
        qualityInspection: 'Inspección de calidad',
        totalPieces: 'piezas totales',
        totalInspected: 'pzas insp.'
      },

      // Presets de tiempo
      presets: {
        today: 'Hoy',
        week: 'Semana',
        currentMonth: 'Mes actual',
        quarter: 'Trimestre',
        year: 'Año',
        all: 'Todo'
      }
    },

    // =====================================================
    // AUDIT - Auditorías
    // =====================================================
    audit: {
      title: 'Gestión de Auditorías',
      dashboard: 'Dashboard de Auditorías',
      programs: 'Programas de Auditoría',
      checklists: 'Checklists',
      auditors: 'Auditores',
      calendar: 'Calendario',
      requests: 'Solicitudes de Auditoría',
      nonConformities: 'No Conformidades',
      ncList: 'Lista de NC',

      // KPIs
      kpi: {
        totalAudits: 'Total Auditorías',
        completedAudits: 'Completadas',
        plannedAudits: 'Planeadas',
        inProgressAudits: 'En Progreso',
        openNCs: 'NCs Abiertas',
        closedNCs: 'NCs Cerradas',
        majorNCs: 'NCs Mayores',
        minorNCs: 'NCs Menores',
        observations: 'Observaciones',
        complianceRate: 'Tasa de Cumplimiento',
        avgClosureTime: 'Prom. Tiempo Cierre'
      },

      // Estados de auditoría
      status: {
        planned: 'Planeada',
        in_progress: 'En Progreso',
        completed: 'Completada',
        cancelled: 'Cancelada',
        postponed: 'Pospuesta'
      },

      // Estados de NC
      ncStatus: {
        open: 'Abierta',
        pending_verification: 'Pendiente Verificación',
        closed: 'Cerrada',
        overdue: 'Vencida'
      },

      // Tipos de NC
      ncTypes: {
        major: 'Mayor',
        minor: 'Menor',
        observation: 'Observación'
      },

      // Tipos de auditoría
      types: {
        internal: 'Interna',
        external: 'Externa',
        supplier: 'Proveedor',
        process: 'Proceso',
        product: 'Producto',
        system: 'Sistema',
        lpa: 'LPA (Auditoría de Proceso por Capas)',
        iatf: 'IATF 16949',
        iso: 'ISO 9001',
        customer: 'Cliente'
      },

      // Campos
      fields: {
        auditId: 'ID Auditoría',
        auditType: 'Tipo de Auditoría',
        auditScope: 'Alcance',
        auditObjective: 'Objetivo',
        leadAuditor: 'Auditor Líder',
        auditTeam: 'Equipo Auditor',
        auditee: 'Auditado',
        department: 'Departamento',
        process: 'Proceso',
        plannedDate: 'Fecha Planeada',
        actualDate: 'Fecha Real',
        duration: 'Duración',
        findings: 'Hallazgos',
        conclusions: 'Conclusiones',
        recommendations: 'Recomendaciones'
      },

      // NC Campos
      ncFields: {
        ncNumber: 'Número NC',
        finding: 'Hallazgo',
        evidence: 'Evidencia',
        clause: 'Cláusula/Requisito',
        rootCause: 'Causa Raíz',
        correctiveAction: 'Acción Correctiva',
        responsiblePerson: 'Persona Responsable',
        dueDate: 'Fecha Límite',
        closureDate: 'Fecha Cierre',
        verificationEvidence: 'Evidencia de Verificación'
      },

      // Tabs
      tabs: {
        overview: 'Vista General',
        audits: 'Auditorías',
        ncs: 'No Conformidades',
        schedule: 'Programación',
        reports: 'Reportes'
      },

      // Acciones
      actions: {
        scheduleAudit: 'Programar Auditoría',
        startAudit: 'Iniciar Auditoría',
        completeAudit: 'Completar Auditoría',
        createNC: 'Crear NC',
        closeNC: 'Cerrar NC',
        verifyNC: 'Verificar NC',
        generateReport: 'Generar Reporte',
        exportPlan: 'Exportar Plan'
      },

      // Mensajes
      messages: {
        noAuditsPlanned: 'No hay auditorías planeadas',
        noOpenNCs: 'No hay no conformidades abiertas',
        auditCompleted: 'Auditoría completada exitosamente',
        ncCreated: 'No conformidad creada',
        ncClosed: 'No conformidad cerrada'
      },

      // Charts
      charts: {
        byStatus: 'Auditorías por Estado',
        byType: 'NC por Tipo',
        trend: 'Tendencia de Auditorías',
        compliance: 'Tasa de Cumplimiento'
      }
    },

    // =====================================================
    // SKILLS - Matriz de Habilidades
    // =====================================================
    skills: {
      title: 'Matriz de Habilidades',
      dashboard: 'Dashboard de Habilidades',
      managerialView: 'Vista gerencial del módulo de habilidades',
      myTeam: 'Mi Equipo',
      myProfile: 'Mi Perfil',
      configuration: 'Configuración',
      evaluate: 'Evaluar',

      // KPIs
      kpi: {
        usersWithProfile: 'Usuarios con Perfil',
        completedEvaluations: 'Evaluaciones Completadas',
        draftEvaluations: 'Evaluaciones en Borrador',
        expiringTraining: 'Capacitaciones por Vencer'
      },

      // Campos
      fields: {
        skill: 'Habilidad',
        category: 'Categoría',
        currentLevel: 'Nivel Actual',
        targetLevel: 'Nivel Objetivo',
        gap: 'Brecha',
        evaluator: 'Evaluador',
        evaluationDate: 'Fecha de Evaluación',
        expirationDate: 'Fecha de Vencimiento',
        certification: 'Certificación',
        training: 'Capacitación',
        notes: 'Notas'
      },

      // Niveles
      levels: {
        notTrained: 'No Capacitado',
        inTraining: 'En Capacitación',
        canDoWithSupervision: 'Puede hacer con supervisión',
        canDoIndependently: 'Puede hacer independientemente',
        canTrain: 'Puede capacitar a otros'
      },

      // Estados de evaluación
      evaluationStatus: {
        draft: 'Borrador',
        submitted: 'Enviada',
        approved: 'Aprobada',
        rejected: 'Rechazada',
        completed: 'Completada'
      },

      // Charts
      charts: {
        avgByCategory: 'Promedio General por Categoría',
        evaluationStatus: 'Estado de Evaluaciones',
        topGaps: 'Principales Brechas de Habilidades',
        teamRadar: 'Radar del Equipo'
      },

      // Acciones
      actions: {
        evaluate: 'Evaluar',
        viewProfile: 'Ver Perfil',
        assignTraining: 'Asignar Capacitación',
        scheduleEvaluation: 'Programar Evaluación',
        exportMatrix: 'Exportar Matriz'
      },

      // Mensajes
      messages: {
        noData: 'Sin datos',
        noEvaluations: 'Sin evaluaciones',
        profileUpdated: 'Perfil actualizado',
        evaluationSaved: 'Evaluación guardada',
        trainingAssigned: 'Capacitación asignada'
      }
    },

    // =====================================================
    // QAR - Quality Alert Request
    // =====================================================
    qar: {
      title: 'Solicitud de Alerta de Calidad',
      dashboard: 'Dashboard QAR',
      newQar: 'Nueva QAR',
      qarList: 'Lista de QARs',

      // Estados
      status: {
        draft: 'Borrador',
        open: 'Abierta',
        investigating: 'Investigando',
        containment: 'Contención',
        resolved: 'Resuelta',
        closed: 'Cerrada',
        escalated: 'Escalada'
      },

      // Tipos
      types: {
        customer: 'Queja de Cliente',
        internal: 'Detección Interna',
        supplier: 'Problema de Proveedor',
        process: 'Desviación de Proceso',
        product: 'No Conformidad de Producto'
      },

      // Campos
      fields: {
        qarNumber: 'Número QAR',
        alertType: 'Tipo de Alerta',
        originSource: 'Fuente de Origen',
        affectedProduct: 'Producto Afectado',
        affectedQuantity: 'Cantidad Afectada',
        containedQuantity: 'Cantidad Contenida',
        defectDescription: 'Descripción del Defecto',
        immediateAction: 'Acción Inmediata',
        responsibleArea: 'Área Responsable',
        escalationLevel: 'Nivel de Escalación'
      },

      // Acciones
      actions: {
        createAlert: 'Crear Alerta',
        escalate: 'Escalar',
        contain: 'Contener',
        investigate: 'Investigar',
        resolve: 'Resolver',
        close: 'Cerrar'
      }
    },

    // =====================================================
    // DEFECTS - Captura de Defectos
    // =====================================================
    defects: {
      title: 'Gestión de Defectos',
      capture: 'Captura de Defectos',
      query: 'Consulta de Defectos',
      hospital: 'Hospital de Defectos',
      configuration: 'Configuración',
      admin: 'Administración',

      // Campos
      fields: {
        defectCode: 'Código de Defecto',
        defectType: 'Tipo de Defecto',
        defectCategory: 'Categoría',
        location: 'Ubicación',
        severity: 'Severidad',
        quantity: 'Cantidad',
        partNumber: 'Número de Parte',
        serialNumber: 'Número de Serie',
        station: 'Estación',
        operator: 'Operador',
        shift: 'Turno',
        captureDate: 'Fecha de Captura',
        description: 'Descripción',
        image: 'Imagen',
        disposition: 'Disposición'
      },

      // Disposiciones
      disposition: {
        scrap: 'Scrap',
        rework: 'Retrabajo',
        useAsIs: 'Usar Como Está',
        returnSupplier: 'Devolver a Proveedor',
        hold: 'Retención',
        reInspect: 'Re-Inspeccionar'
      },

      // Mensajes
      messages: {
        defectCaptured: 'Defecto capturado exitosamente',
        noDefects: 'No se encontraron defectos',
        scanPart: 'Escanee o ingrese número de parte'
      }
    },

    // =====================================================
    // USERS - Gestión de Usuarios
    // =====================================================
    users: {
      title: 'Gestión de Usuarios',
      newUser: 'Nuevo Usuario',
      userList: 'Lista de Usuarios',
      roles: 'Roles',
      departments: 'Departamentos',
      permissions: 'Permisos',

      // Campos
      fields: {
        username: 'Usuario',
        email: 'Correo Electrónico',
        firstName: 'Nombre',
        lastName: 'Apellido',
        fullName: 'Nombre Completo',
        password: 'Contraseña',
        confirmPassword: 'Confirmar Contraseña',
        role: 'Rol',
        department: 'Departamento',
        position: 'Puesto',
        employeeNumber: 'Número de Empleado',
        phone: 'Teléfono',
        status: 'Estado',
        lastLogin: 'Último Acceso',
        createdAt: 'Fecha de Creación'
      },

      // Estados
      status: {
        active: 'Activo',
        inactive: 'Inactivo',
        pending: 'Pendiente',
        blocked: 'Bloqueado'
      },

      // Acciones
      actions: {
        createUser: 'Crear Usuario',
        editUser: 'Editar Usuario',
        deleteUser: 'Eliminar Usuario',
        resetPassword: 'Restablecer Contraseña',
        assignRole: 'Asignar Rol',
        activateUser: 'Activar Usuario',
        deactivateUser: 'Desactivar Usuario'
      },

      // Mensajes
      messages: {
        userCreated: 'Usuario creado exitosamente',
        userUpdated: 'Usuario actualizado exitosamente',
        userDeleted: 'Usuario eliminado exitosamente',
        passwordReset: 'Contraseña restablecida exitosamente',
        invalidCredentials: 'Credenciales inválidas',
        userExists: 'El usuario ya existe'
      }
    },

    // =====================================================
    // HOME - Página Principal
    // =====================================================
    home: {
      title: 'Sistema de Gestión de Calidad',
      subtitle: 'Plataforma integral para control de calidad y mejora continua',
      selectModule: 'Seleccione un módulo para comenzar',
      recentActivity: 'Actividad Reciente',
      quickAccess: 'Acceso Rápido',
      pendingTasks: 'Tareas Pendientes',
      systemStatus: 'Estado del Sistema',
      moduleDescriptions: {
        eightD: 'Metodología estructurada de solución de problemas',
        ecr: 'Gestión de cambios de ingeniería',
        mrb: 'Revisión y disposición de material',
        audit: 'Gestión de auditorías internas y externas',
        qar: 'Alertas de calidad y contención',
        defects: 'Captura y seguimiento de defectos',
        skills: 'Matriz de habilidades del personal',
        wi: 'Gestión de instrucciones de trabajo'
      }
    },

    // =====================================================
    // CONFIGURATION - Configuración
    // =====================================================
    config: {
      title: 'Configuración',
      general: 'General',
      system: 'Sistema',
      modules: 'Módulos',
      integrations: 'Integraciones',
      notifications: 'Notificaciones',
      backup: 'Respaldo',
      audit: 'Bitácora',

      // Secciones
      sections: {
        company: 'Información de Empresa',
        locale: 'Idioma y Región',
        theme: 'Tema y Apariencia',
        email: 'Configuración de Correo',
        security: 'Seguridad',
        workflow: 'Flujo de Trabajo',
        reports: 'Reportes'
      },

      // Campos
      fields: {
        companyName: 'Nombre de Empresa',
        logo: 'Logo',
        timezone: 'Zona Horaria',
        dateFormat: 'Formato de Fecha',
        language: 'Idioma',
        currency: 'Moneda',
        smtpServer: 'Servidor SMTP',
        smtpPort: 'Puerto SMTP',
        sessionTimeout: 'Tiempo de Sesión',
        passwordPolicy: 'Política de Contraseñas'
      }
    },

    // =====================================================
    // WORK INSTRUCTIONS
    // =====================================================
    workInstructions: {
      title: 'Instrucciones de Trabajo',
      newInstruction: 'Nueva Instrucción',
      list: 'Lista de Instrucciones',
      operatorProfile: 'Perfil del Operador',

      // Campos
      fields: {
        wiNumber: 'Número IT',
        title: 'Título',
        revision: 'Revisión',
        process: 'Proceso',
        station: 'Estación',
        effectiveDate: 'Fecha Efectiva',
        author: 'Autor',
        approver: 'Aprobador',
        content: 'Contenido',
        safetyNotes: 'Notas de Seguridad',
        qualityPoints: 'Puntos de Calidad'
      },

      // Estados
      status: {
        draft: 'Borrador',
        pendingApproval: 'Pendiente de Aprobación',
        approved: 'Aprobado',
        obsolete: 'Obsoleto'
      }
    },

    // =====================================================
    // LESSONS LEARNED
    // =====================================================
    lessonsLearned: {
      title: 'Lecciones Aprendidas',
      newLesson: 'Nueva Lección',
      library: 'Biblioteca de Lecciones',

      // Campos
      fields: {
        lessonId: 'ID Lección',
        title: 'Título',
        category: 'Categoría',
        source: 'Fuente',
        problem: 'Problema/Situación',
        solution: 'Solución/Mejor Práctica',
        benefit: 'Beneficio/Impacto',
        applicability: 'Aplicabilidad',
        keywords: 'Palabras Clave'
      },

      // Categorías
      categories: {
        quality: 'Calidad',
        process: 'Proceso',
        safety: 'Seguridad',
        equipment: 'Equipo',
        supplier: 'Proveedor',
        customer: 'Cliente'
      }
    }
  }
};

// Hook personalizado para traducciones
export const useTranslation = (language = 'es') => {
  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };

  return { t };
};

// Función auxiliar para obtener traducción directa
export const translate = (key, language = 'es') => {
  const keys = key.split('.');
  let value = translations[language];

  for (const k of keys) {
    value = value?.[k];
  }

  return value || key;
};
