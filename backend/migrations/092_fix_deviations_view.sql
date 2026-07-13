-- =====================================================
-- Fix vista v_deviations para incluir conteos
-- Migración: 092_fix_deviations_view.sql
-- =====================================================

CREATE OR REPLACE VIEW v_deviations AS
SELECT
    d.id,
    d.reference_number,
    d.deviation_type,
    d.description,
    d.client_id,
    c.name AS client_name,
    d.project_id,
    p.project_name,
    d.part_id,
    cp.part_number,
    cp.part_name,
    d.validity_date,
    d.status,
    d.notes,
    d.created_by,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) AS created_by_name,
    d.created_at,
    d.updated_at,
    (SELECT COUNT(*) FROM deviation_attachments da WHERE da.deviation_id = d.id) AS attachment_count,
    (SELECT COUNT(*) FROM defect_deviations dd WHERE dd.deviation_id = d.id) AS linked_defects_count
FROM deviations d
LEFT JOIN clients c ON d.client_id = c.id
LEFT JOIN projects p ON d.project_id = p.id
LEFT JOIN client_parts cp ON d.part_id = cp.id
LEFT JOIN users u ON d.created_by = u.id;
