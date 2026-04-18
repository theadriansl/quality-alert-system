-- Script para crear tablas de reportes 8D
-- Ejecutar en pgAdmin4 después de los scripts anteriores

-- Tabla principal de reportes 8D
CREATE TABLE eightd_reports (
    id SERIAL PRIMARY KEY,
    report_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Información del problema
    supplier_name VARCHAR(255),
    supplier_account VARCHAR(255),
    part_number VARCHAR(100),
    part_name VARCHAR(255),
    problem_type VARCHAR(50) CHECK (problem_type IN ('Nuevo', 'Repetitivo')),
    
    -- Severidad y clasificación
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('High', 'Medium', 'Low')) DEFAULT 'Medium',
    tipo_issue VARCHAR(50) CHECK (tipo_issue IN ('Supplier', 'Internal', 'Customer')),
    tipo_resp VARCHAR(50) CHECK (tipo_resp IN ('R&D', 'Manufacturing', 'Quality', 'Supplier')),
    timing_occurrence VARCHAR(255),
    
    -- Status y progreso
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
    current_step VARCHAR(50) NOT NULL DEFAULT 'escalation' CHECK (current_step IN ('escalation', 'create8d', 'analysis', 'validation', 'closed')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Costos
    estimated_cost DECIMAL(12,2) DEFAULT 0,
    actual_cost DECIMAL(12,2) DEFAULT 0,
    
    -- Fechas importantes
    issue_date DATE NOT NULL,
    target_closure_date DATE,
    actual_closure_date DATE,
    
    -- Asignaciones de equipo (escalation path)
    issue_assigned_to INTEGER REFERENCES users(id),
    countermeasure_assigned_to INTEGER REFERENCES users(id),
    confirmation_assigned_to INTEGER REFERENCES users(id),
    
    -- Metadatos
    created_by INTEGER REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Campos adicionales
    delay_reason VARCHAR(255),
    customer_impact TEXT,
    lessons_learned TEXT
);

-- Tabla para tracking de cambios de status
CREATE TABLE eightd_status_history (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES eightd_reports(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    previous_step VARCHAR(50),
    new_step VARCHAR(50) NOT NULL,
    changed_by INTEGER REFERENCES users(id),
    change_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para comentarios y updates
CREATE TABLE eightd_comments (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES eightd_reports(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'general' CHECK (comment_type IN ('general', 'status_update', 'escalation', 'resolution')),
    is_internal BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para adjuntos/documentos
CREATE TABLE eightd_attachments (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES eightd_reports(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    upload_path VARCHAR(500),
    uploaded_by INTEGER REFERENCES users(id) NOT NULL,
    upload_date TIMESTAMP DEFAULT NOW(),
    description VARCHAR(255)
);

-- Índices para optimizar consultas
CREATE INDEX idx_eightd_reports_status ON eightd_reports(status);
CREATE INDEX idx_eightd_reports_severity ON eightd_reports(severity);
CREATE INDEX idx_eightd_reports_current_step ON eightd_reports(current_step);
CREATE INDEX idx_eightd_reports_created_at ON eightd_reports(created_at);
CREATE INDEX idx_eightd_reports_issue_date ON eightd_reports(issue_date);
CREATE INDEX idx_eightd_reports_supplier ON eightd_reports(supplier_name);
CREATE INDEX idx_eightd_status_history_report_id ON eightd_status_history(report_id);
CREATE INDEX idx_eightd_comments_report_id ON eightd_comments(report_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
CREATE TRIGGER update_eightd_reports_updated_at 
    BEFORE UPDATE ON eightd_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular días abiertos
CREATE OR REPLACE FUNCTION get_days_open(issue_date DATE, closure_date DATE DEFAULT NULL)
RETURNS INTEGER AS $$
BEGIN
    IF closure_date IS NOT NULL THEN
        RETURN EXTRACT(DAY FROM closure_date - issue_date);
    ELSE
        RETURN EXTRACT(DAY FROM CURRENT_DATE - issue_date);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Vista para métricas del dashboard
CREATE VIEW dashboard_metrics AS
SELECT 
    COUNT(*) as total_reports,
    COUNT(*) FILTER (WHERE status = 'in_progress') as open_reports,
    COUNT(*) FILTER (WHERE status = 'completed') as closed_reports,
    COUNT(*) FILTER (WHERE status = 'in_progress' AND target_closure_date < CURRENT_DATE) as overdue_reports,
    COALESCE(SUM(estimated_cost), 0) as total_estimated_cost,
    COALESCE(SUM(actual_cost), 0) as total_actual_cost,
    ROUND(AVG(progress_percentage), 1) as avg_progress,
    COUNT(*) FILTER (WHERE severity = 'High') as high_severity,
    COUNT(*) FILTER (WHERE severity = 'Medium') as medium_severity,
    COUNT(*) FILTER (WHERE severity = 'Low') as low_severity
FROM eightd_reports
WHERE status != 'cancelled';

-- Vista para reportes abiertos con detalles
CREATE VIEW open_reports_detail AS
SELECT 
    r.id,
    r.report_id,
    r.title,
    r.supplier_name as customer,
    r.severity,
    r.current_step as status,
    r.progress_percentage as progress,
    get_days_open(r.issue_date, r.actual_closure_date) as days_open,
    r.estimated_cost,
    COALESCE(r.delay_reason, '-') as delay_reason,
    CASE 
        WHEN r.target_closure_date < CURRENT_DATE AND r.status = 'in_progress' THEN true
        ELSE false
    END as is_overdue,
    u1.first_name || ' ' || u1.last_name as issue_assignee,
    u2.first_name || ' ' || u2.last_name as countermeasure_assignee,
    u3.first_name || ' ' || u3.last_name as confirmation_assignee,
    r.created_at,
    r.updated_at
FROM eightd_reports r
LEFT JOIN users u1 ON r.issue_assigned_to = u1.id
LEFT JOIN users u2 ON r.countermeasure_assigned_to = u2.id  
LEFT JOIN users u3 ON r.confirmation_assigned_to = u3.id
WHERE r.status = 'in_progress'
ORDER BY r.updated_at DESC;