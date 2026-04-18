// Services Data - Team members and timesheets for jobs

const teamMembers = [
  {
    id: 1,
    jobId: 1,
    name: 'John Smith',
    role: 'Supervisor', // Supervisor or Inspector
    email: 'john.smith@company.com',
    phone: '+1-555-0101',
    startDate: '2024-01-15',
    status: 'Active',
    hourlyRate: 29.00 // Base rate from quote
  },
  {
    id: 2,
    jobId: 1,
    name: 'Sarah Johnson',
    role: 'Inspector',
    email: 'sarah.j@company.com',
    phone: '+1-555-0102',
    startDate: '2024-01-15',
    status: 'Active',
    hourlyRate: 26.00
  },
  {
    id: 3,
    jobId: 1,
    name: 'Mike Chen',
    role: 'Inspector',
    email: 'mike.c@company.com',
    phone: '+1-555-0103',
    startDate: '2024-02-01',
    status: 'Active',
    hourlyRate: 26.00
  }
];

const timesheets = [
  {
    id: 1,
    jobId: 1,
    teamMemberId: 1,
    date: '2025-11-04',
    regularHours: 8,
    overtimeHours: 0,
    shiftType: 'shift1', // shift1, shift2_3, saturday, sunday, holiday
    description: 'Quality inspection and team supervision',
    overtimeApprovedBy: null,
    status: 'Approved',
    approvedBy: 'Project Manager',
    approvedAt: '2025-11-05'
  },
  {
    id: 2,
    jobId: 1,
    teamMemberId: 2,
    date: '2025-11-04',
    regularHours: 8,
    overtimeHours: 0,
    shiftType: 'shift1',
    description: 'Part inspection and quality checks',
    overtimeApprovedBy: null,
    status: 'Approved',
    approvedBy: 'Project Manager',
    approvedAt: '2025-11-05'
  },
  {
    id: 3,
    jobId: 1,
    teamMemberId: 3,
    date: '2025-11-04',
    regularHours: 8,
    overtimeHours: 0,
    shiftType: 'shift1',
    description: 'Component verification',
    overtimeApprovedBy: null,
    status: 'Approved',
    approvedBy: 'Project Manager',
    approvedAt: '2025-11-05'
  },
  {
    id: 4,
    jobId: 1,
    teamMemberId: 1,
    date: '2025-11-05',
    regularHours: 8,
    overtimeHours: 2,
    shiftType: 'shift1',
    description: 'Quality inspection and team supervision - Extended shift',
    overtimeApprovedBy: 'Carlos Lopez - Plant Manager',
    status: 'Pending',
    approvedBy: null,
    approvedAt: null
  },
  {
    id: 5,
    jobId: 1,
    teamMemberId: 2,
    date: '2025-11-05',
    regularHours: 8,
    overtimeHours: 0,
    shiftType: 'shift1',
    description: 'Part inspection and quality checks',
    overtimeApprovedBy: null,
    status: 'Pending',
    approvedBy: null,
    approvedAt: null
  }
];

module.exports = { teamMembers, timesheets };
