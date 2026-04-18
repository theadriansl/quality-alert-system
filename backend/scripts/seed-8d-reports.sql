-- Sample 8D reports for testing
INSERT INTO eightd_reports (
    report_id, title, description, supplier_name, supplier_account,
    part_number, part_name, problem_type, severity, tipo_issue,
    tipo_resp, timing_occurrence, estimated_cost, issue_date,
    target_closure_date, issue_assigned_to, countermeasure_assigned_to,
    confirmation_assigned_to, customer_impact, created_by, progress_percentage,
    status, current_step, actual_cost
) VALUES 
(
    '8D-2025-0001', 
    'Defective Brake Pads Quality Issue',
    'Customer reported brake pads showing premature wear after 10,000 miles. Investigation needed.',
    'ABC Brake Components',
    'ABC-2024-BP001',
    'BP-X450-23',
    'Front Brake Pad Assembly',
    'Nuevo',
    'High',
    'Supplier',
    'Quality',
    'Customer complaint received 2025-01-15',
    50000.00,
    '2025-01-15',
    '2025-02-15',
    1, -- issue_assigned_to (admin)
    2, -- countermeasure_assigned_to (manager)
    3, -- confirmation_assigned_to (engineer)
    'Customer experiencing unsafe braking conditions. 500 units potentially affected.',
    1, -- created_by (admin)
    75,
    'in_progress',
    'analysis',
    12000.00
),
(
    '8D-2025-0002',
    'Paint Adhesion Failure on Door Panels',
    'Paint peeling reported on multiple vehicle door panels during final inspection.',
    'XYZ Paint Solutions',
    'XYZ-2024-PT002',
    'PT-D789-15',
    'Door Panel Paint System',
    'Repetitivo',
    'Medium',
    'Supplier',
    'Manufacturing',
    'Identified during final quality check',
    25000.00,
    '2025-01-20',
    '2025-02-28',
    3, -- issue_assigned_to (engineer)
    4, -- countermeasure_assigned_to (technician)
    2, -- confirmation_assigned_to (manager)
    'Cosmetic defect affecting customer satisfaction. 150 units affected.',
    2, -- created_by (manager)
    45,
    'in_progress',
    'create8d',
    8500.00
),
(
    '8D-2025-0003',
    'ECU Software Bug Causing Engine Stall',
    'Engine control unit software bug causing random engine stalls under specific conditions.',
    'DEF Electronics',
    'DEF-2024-EC003',
    'ECU-M567-89',
    'Engine Control Unit',
    'Nuevo',
    'High',
    'Supplier',
    'R&D',
    'Field reports from dealers',
    75000.00,
    '2025-01-10',
    '2025-02-10',
    2, -- issue_assigned_to (manager)
    1, -- countermeasure_assigned_to (admin)
    4, -- confirmation_assigned_to (technician)
    'Safety critical issue. Potential recall required. 2000 units affected.',
    1, -- created_by (admin)
    90,
    'in_progress',
    'validation',
    45000.00
),
(
    '8D-2025-0004',
    'Seat Belt Buckle Mechanism Failure',
    'Seat belt buckles not engaging properly, safety concern raised by quality team.',
    'GHI Safety Systems',
    'GHI-2024-SB004',
    'SB-B234-56',
    'Front Seat Belt Buckle',
    'Nuevo',
    'High',
    'Supplier',
    'Quality',
    'Internal quality audit finding',
    60000.00,
    '2025-01-18',
    '2025-02-18',
    4, -- issue_assigned_to (technician)
    3, -- countermeasure_assigned_to (engineer)
    1, -- confirmation_assigned_to (admin)
    'Critical safety issue. Production line stopped. 800 units quarantined.',
    3, -- created_by (engineer)
    30,
    'in_progress',
    'escalation',
    15000.00
),
(
    '8D-2025-0005',
    'Air Filter Housing Crack Issue',
    'Plastic air filter housing showing stress cracks after temperature cycling tests.',
    'JKL Plastics Inc',
    'JKL-2024-AF005',
    'AF-H123-78',
    'Air Filter Housing Assembly',
    'Repetitivo',
    'Low',
    'Supplier',
    'Manufacturing',
    'Discovered during durability testing',
    15000.00,
    '2025-01-25',
    '2025-03-15',
    3, -- issue_assigned_to (engineer)
    4, -- countermeasure_assigned_to (technician)
    2, -- confirmation_assigned_to (manager)
    'Minor functionality impact. No immediate safety concern. 300 units affected.',
    4, -- created_by (technician)
    100,
    'completed',
    'closed',
    8200.00
);

-- Add some status history
INSERT INTO eightd_status_history (report_id, previous_status, new_status, previous_step, new_step, changed_by, change_reason) VALUES
(1, 'draft', 'in_progress', 'escalation', 'create8d', 1, 'Initial investigation started'),
(1, 'in_progress', 'in_progress', 'create8d', 'analysis', 2, 'Root cause analysis phase'),
(2, 'draft', 'in_progress', 'escalation', 'create8d', 2, 'Team assigned for investigation'),
(3, 'draft', 'in_progress', 'escalation', 'analysis', 1, 'High priority - fast tracked'),
(3, 'in_progress', 'in_progress', 'analysis', 'validation', 1, 'Moving to validation phase'),
(4, 'draft', 'in_progress', 'escalation', 'escalation', 3, 'Critical safety issue escalated'),
(5, 'draft', 'in_progress', 'escalation', 'create8d', 4, 'Standard process initiated'),
(5, 'in_progress', 'completed', 'validation', 'closed', 2, 'Issue resolved and verified');

-- Add some comments
INSERT INTO eightd_comments (report_id, user_id, comment_text, comment_type) VALUES
(1, 1, 'Customer complaint received. Investigating brake pad composition and manufacturing process.', 'status_update'),
(1, 2, 'Lab analysis shows contamination in brake pad material. Supplier audit scheduled.', 'general'),
(2, 3, 'Paint adhesion test results show humidity control issue during curing process.', 'status_update'),
(3, 1, 'Software bug confirmed in ECU version 2.1.5. Patch development in progress.', 'escalation'),
(3, 2, 'Field test of software patch successful. Preparing for production deployment.', 'status_update'),
(4, 4, 'Seat belt buckle spring mechanism shows metallurgical defects. Material analysis required.', 'general'),
(5, 3, 'Temperature cycling test protocol updated. New housing design validated.', 'resolution'),
(5, 2, 'Issue closed. Improved housing design approved for production.', 'resolution');