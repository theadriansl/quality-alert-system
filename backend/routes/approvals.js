// =====================================================
// SISTEMA FLEXIBLE DE APROBACIONES 8D
// =====================================================

// Configuración base de pasos de aprobación
const approvalStepsTemplate = {
  step1_issue_reporting: {
    id: 'step1_issue_reporting',
    name: 'Issue Reporting',
    description: 'Initial problem reporting',
    role: 'issuer',
    action: 'report_issue',
    required: true,
    automatic: true,
    configurable: false,
    timeLimit: null
  },
  
  step2_assign_responsibility: {
    id: 'step2_assign_responsibility',
    name: 'Assign Countermeasure Lead',
    description: 'Assign follow-up person in plant',
    role: 'manager',
    action: 'assign_lead',
    required: true,
    automatic: false,
    configurable: true,
    timeLimit: 24, // hours
    escalationRoles: ['Champion']
  },
  
  step3_section_validation: {
    id: 'step3_section_validation',
    name: 'Related Section Validation',
    description: 'Cross-functional validation',
    role: 'section_validator',
    action: 'validate_scope',
    required: false,
    automatic: false,
    configurable: true,
    timeLimit: 48,
    severityTrigger: ['High', 'Medium'] // Solo para severidad media/alta
  },
  
  step4_initial_check: {
    id: 'step4_initial_check',
    name: 'Initial Investigation Check',
    description: 'Verify steps D1-D3 completion',
    role: 'checker',
    action: 'check_d1_d3',
    required: false,
    automatic: false,
    configurable: true,
    timeLimit: 72
  },
  
  step5_manager_approval: {
    id: 'step5_manager_approval',
    name: 'Manager Approval',
    description: 'Manager approval for investigation',
    role: 'manager',
    action: 'approve_investigation',
    required: true,
    automatic: false,
    configurable: true,
    timeLimit: 48,
    costTrigger: 5000 // Trigger si costo > $5000
  },
  
  step6_countermeasure_impl: {
    id: 'step6_countermeasure_impl',
    name: 'Countermeasure Implementation',
    description: 'Implement corrective actions',
    role: 'countermeasure_implementer',
    action: 'implement_actions',
    required: true,
    automatic: false,
    configurable: true,
    timeLimit: 168, // 1 week
    cmlValidation: true // Integra con Countermeasure Ladder
  },
  
  step7_effectiveness_judge: {
    id: 'step7_effectiveness_judge',
    name: 'Effectiveness Judgment',
    description: 'Judge countermeasure effectiveness',
    role: 'approval_judge',
    action: 'judge_effectiveness',
    required: false,
    automatic: false,
    configurable: true,
    timeLimit: 72,
    severityTrigger: ['High']
  },
  
  step8_final_judgment: {
    id: 'step8_final_judgment',
    name: 'Final Technical Judgment',
    description: 'Final technical assessment',
    role: 'final_judge',
    action: 'final_technical_judgment',
    required: true,
    automatic: false,
    configurable: true,
    timeLimit: 48
  },
  
  step9_final_check: {
    id: 'step9_final_check',
    name: 'Final Administrative Check',
    description: 'Final documentation review',
    role: 'final_checker',
    action: 'final_admin_check',
    required: false,
    automatic: false,
    configurable: true,
    timeLimit: 24
  },
  
  step10_final_approval: {
    id: 'step10_final_approval',
    name: 'Final Management Approval',
    description: 'Final closure approval',
    role: 'final_manager',
    action: 'final_approval',
    required: true,
    automatic: false,
    configurable: true,
    timeLimit: 48,
    costTrigger: 10000
  }
};

// Configuraciones predefinidas por tipo de empresa
const companyTemplates = {
  startup: {
    name: 'Startup/Small Company',
    description: 'Minimal bureaucracy, fast decisions',
    enabledSteps: [
      'step1_issue_reporting',
      'step2_assign_responsibility', 
      'step5_manager_approval',
      'step6_countermeasure_impl',
      'step8_final_judgment',
      'step10_final_approval'
    ],
    timeLimits: {
      step2_assign_responsibility: 12,
      step5_manager_approval: 24,
      step6_countermeasure_impl: 120,
      step8_final_judgment: 24,
      step10_final_approval: 24
    }
  },
  
  tier1_supplier: {
    name: 'Tier 1 Automotive Supplier',
    description: 'Standard automotive requirements',
    enabledSteps: [
      'step1_issue_reporting',
      'step2_assign_responsibility',
      'step3_section_validation',
      'step4_initial_check',
      'step5_manager_approval',
      'step6_countermeasure_impl',
      'step7_effectiveness_judge',
      'step8_final_judgment',
      'step10_final_approval'
    ],
    severityMatrix: {
      High: ['step3_section_validation', 'step4_initial_check', 'step7_effectiveness_judge'],
      Medium: ['step3_section_validation'],
      Low: []
    }
  },
  
  oem_corporate: {
    name: 'OEM Corporate (Ford/GM/Stellantis)',
    description: 'Full compliance and documentation',
    enabledSteps: 'all',
    strictMode: true,
    timeLimits: {
      step2_assign_responsibility: 8,
      step3_section_validation: 24,
      step4_initial_check: 48,
      step5_manager_approval: 24,
      step6_countermeasure_impl: 168,
      step7_effectiveness_judge: 48,
      step8_final_judgment: 24,
      step9_final_check: 12,
      step10_final_approval: 24
    }
  }
};

// Sistema de configuración dinámico
class ApprovalFlowConfigurator {
  constructor() {
    this.baseSteps = approvalStepsTemplate;
    this.templates = companyTemplates;
  }

  // Crear configuración personalizada
  createCustomFlow(companyType, customizations = {}) {
    const template = this.templates[companyType];
    if (!template) {
      throw new Error(`Company type ${companyType} not found`);
    }

    let enabledSteps;
    if (template.enabledSteps === 'all') {
      enabledSteps = Object.keys(this.baseSteps);
    } else {
      enabledSteps = template.enabledSteps;
    }

    const customFlow = {};
    
    enabledSteps.forEach(stepId => {
      const baseStep = { ...this.baseSteps[stepId] };
      
      // Aplicar configuraciones del template
      if (template.timeLimits && template.timeLimits[stepId]) {
        baseStep.timeLimit = template.timeLimits[stepId];
      }
      
      // Aplicar personalizaciones específicas
      if (customizations[stepId]) {
        Object.assign(baseStep, customizations[stepId]);
      }
      
      customFlow[stepId] = baseStep;
    });

    return {
      companyType,
      template: template.name,
      flow: customFlow,
      severityMatrix: template.severityMatrix || {},
      strictMode: template.strictMode || false
    };
  }

  // Determinar qué pasos aplican para un 8D específico
  getApplicableSteps(flowConfig, eightDData) {
    const { severity, estimatedCost, customerType } = eightDData;
    const applicableSteps = [];

    Object.values(flowConfig.flow).forEach(step => {
      let shouldInclude = true;

      // Verificar trigger de severidad
      if (step.severityTrigger && !step.severityTrigger.includes(severity)) {
        shouldInclude = false;
      }

      // Verificar trigger de costo
      if (step.costTrigger && estimatedCost < step.costTrigger) {
        shouldInclude = false;
      }

      // Verificar matriz de severidad del template
      if (flowConfig.severityMatrix[severity]) {
        const requiredForSeverity = flowConfig.severityMatrix[severity];
        if (requiredForSeverity.length > 0 && !requiredForSeverity.includes(step.id)) {
          shouldInclude = false;
        }
      }

      if (shouldInclude || step.required) {
        applicableSteps.push({
          ...step,
          estimatedDuration: step.timeLimit,
          dueDate: this.calculateDueDate(step.timeLimit)
        });
      }
    });

    return applicableSteps;
  }

  calculateDueDate(hoursFromNow) {
    if (!hoursFromNow) return null;
    const due = new Date();
    due.setHours(due.getHours() + hoursFromNow);
    return due;
  }
}

// Ejemplo de uso del configurador
const configurator = new ApprovalFlowConfigurator();

// Configuración para Tier 1 Supplier
const tier1Config = configurator.createCustomFlow('tier1_supplier', {
  step5_manager_approval: {
    timeLimit: 36, // Override: 36 horas en lugar de default
    escalationRoles: ['Champion', 'Plant_Manager']
  }
});

// Configuración para Startup
const startupConfig = configurator.createCustomFlow('startup');

// Ejemplo de 8D que necesita aprobaciones
const sample8D = {
  id: '8D-2025-020',
  title: 'Engine Block Porosity Issue',
  severity: 'High',
  estimatedCost: 15000,
  customerType: 'OEM',
  reporter: 'john.doe@company.com'
};

// Obtener pasos aplicables
const applicableSteps = configurator.getApplicableSteps(tier1Config, sample8D);

console.log('Pasos aplicables para 8D de alta severidad:', applicableSteps.map(s => s.name));

// Export para uso en el sistema
module.exports = {
  ApprovalFlowConfigurator,
  approvalStepsTemplate,
  companyTemplates
};