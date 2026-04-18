// Quotes Data Model
// Stores all quotes/quotations for jobs

const quotes = [
  {
    id: 1,
    jobId: 1,
    quoteNumber: 'Q-2024-001',
    date: '2024-01-15',
    status: 'Draft', // Draft, Sent, Accepted, Rejected

    // Client Information (auto-filled from job/client)
    clientCompany: 'Acme Manufacturing',
    clientContact: 'John Smith',
    clientBillingAddress: '123 Industrial Way',
    clientCity: 'Detroit, MI 48201',
    clientPhone: '555-0100',
    clientEmail: 'john.smith@acme.com',

    // Service Location (can be different from billing)
    serviceCompany: 'Acme Manufacturing Plant 2',
    serviceContact: 'Jane Doe',
    serviceAddress: '456 Factory Road',
    serviceCity: 'Detroit, MI 48202',
    servicePhone: '555-0101',
    serviceEmail: 'jane.doe@acme.com',

    // Project Information
    projectDescription: 'Quality inspection and sorting services for automotive parts',
    partDescriptions: 'Door panels, trim components, dashboard assemblies',

    // Service Rates Configuration
    serviceRates: {
      workingSupervisor: {
        shift1: 29.00,
        shift2_3: 29.00,
        overtime: 43.50,
        saturday: 43.50,
        sunday: 43.50,
        holiday: 53.50
      },
      inspector: {
        shift1: 26.00,
        shift2_3: 26.00,
        overtime: 39.00,
        saturday: 39.00,
        sunday: 39.00,
        holiday: 52.00
      }
    },

    // Agreed Services
    agreedServices: '3 Inspectors, 1 Working Supervisor per shift / 500 hours authorized',
    estimatedHours: 500,

    // Additional Terms
    minimumHours: 4, // Minimum hours per team member
    overtimeThreshold: 40, // Hours before overtime kicks in
    materialMarkup: 10, // Percentage markup on materials

    // Purchase Order Info
    purchaseOrderNumber: '',
    purchaseOrderAmount: '',

    // Signatures
    signedByClient: false,
    clientSignature: null,
    clientSignatureDate: null,
    clientSignatureTitle: null,

    signedByCompany: false,
    companySignature: null,
    companySignatureDate: null,

    // Metadata
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    createdBy: 'System',

    // Export tracking
    exportedToPDF: false,
    exportedToWord: false,
    lastExportedAt: null
  }
];

module.exports = quotes;
