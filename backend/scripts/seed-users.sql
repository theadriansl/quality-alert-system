-- Script para poblar la base de datos con usuarios iniciales
-- Ejecutar después de setup-database.sql

-- Insertar usuarios iniciales (contraseñas hasheadas con bcrypt)
-- La contraseña para todos es: "password123"
INSERT INTO users (email, password, first_name, last_name, role, department, phone, extension, location, availability, emergency_contact, can_assign, is_active) VALUES

-- Champions (Directores)
('john.doe@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'John', 'Doe', 'champion', 'Quality Management', '+52-555-0001', '1001', 'Planta Norte - Oficina 201', 'available', '+52-555-9001', true, true),

('sarah.wilson@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'Sarah', 'Wilson', 'champion', 'Quality Management', '+52-555-0020', '1020', 'Planta Sur - Oficina 301', 'available', '+52-555-9020', true, true),

-- Managers (Gerentes)
('maria.garcia@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'María', 'García', 'manager', 'Quality Engineering', '+52-555-0002', '1002', 'Planta Sur - Lab A', 'available', '+52-555-9002', true, true),

('sofia.hernandez@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'Sofía', 'Hernández', 'manager', 'Quality Control', '+52-555-0006', '1006', 'Planta Sur - Oficina 101', 'available', '+52-555-9006', true, true),

('miguel.torres@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'Miguel', 'Torres', 'manager', 'Production', '+52-555-0015', '1015', 'Planta Norte - Oficina 150', 'available', '+52-555-9015', true, true),

-- Engineers (Ingenieros)
('carlos.lopez@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'Carlos', 'López', 'engineer', 'Quality Engineering', '+52-555-0003', '1003', 'Planta Norte - Lab B', 'available', '+52-555-9003', false, true),

('luis.rodriguez@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'Luis', 'Rodríguez', 'engineer', 'Quality Engineering', '+52-555-0005', '1005', 'Planta Norte - Lab C', 'available', '+52-555-9005', false, true),

('carmen.flores@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'Carmen', 'Flores', 'engineer', 'Engineering', '+52-555-0008', '1008', 'Planta Sur - Oficina 202', 'available', '+52-555-9008', false, true),

('alejandro.morales@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'Alejandro', 'Morales', 'engineer', 'Quality Engineering', '+52-555-0010', '1010', 'Planta Norte - Lab D', 'busy', '+52-555-9010', false, true),

('patricia.jimenez@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'Patricia', 'Jiménez', 'engineer', 'Procurement', '+52-555-0012', '1012', 'Planta Sur - Oficina 205', 'available', '+52-555-9012', false, true),

-- Technicians (Técnicos)
('ana.martinez@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'Ana', 'Martínez', 'technician', 'Quality Control', '+52-555-0004', '1004', 'Planta Sur - Línea 1', 'available', '+52-555-9004', false, true),

('pedro.sanchez@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'Pedro', 'Sánchez', 'technician', 'Production', '+52-555-0007', '1007', 'Planta Norte - Línea 2', 'busy', '+52-555-9007', false, true),

('ricardo.vargas@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'Ricardo', 'Vargas', 'technician', 'Quality Control', '+52-555-0009', '1009', 'Planta Sur - Línea 3', 'available', '+52-555-9009', false, true),

('fernanda.cruz@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'Fernanda', 'Cruz', 'technician', 'Production', '+52-555-0011', '1011', 'Planta Norte - Línea 4', 'available', '+52-555-9011', false, true),

('daniel.medina@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'Daniel', 'Medina', 'technician', 'Quality Control', '+52-555-0013', '1013', 'Planta Sur - Línea 5', 'available', '+52-555-9013', false, true),

('valeria.ramos@company.com', '$2b$10$rZ5cQzGqQVb5GJHs9z1.GeQH5y9z1.GeQH5y9z1.GeQH5y9z1.GeQH', 'Valeria', 'Ramos', 'technician', 'Production', '+52-555-0014', '1014', 'Planta Norte - Línea 6', 'unavailable', '+52-555-9014', false, true);

-- Actualizar las relaciones manager_id después de insertar todos los usuarios
UPDATE users SET manager_id = (SELECT id FROM users WHERE email = 'john.doe@company.com') 
WHERE email IN ('maria.garcia@company.com', 'sofia.hernandez@company.com', 'miguel.torres@company.com');

UPDATE users SET manager_id = (SELECT id FROM users WHERE email = 'maria.garcia@company.com') 
WHERE email IN ('carlos.lopez@company.com', 'luis.rodriguez@company.com', 'alejandro.morales@company.com');

UPDATE users SET manager_id = (SELECT id FROM users WHERE email = 'sofia.hernandez@company.com') 
WHERE email IN ('ana.martinez@company.com', 'ricardo.vargas@company.com', 'daniel.medina@company.com');

UPDATE users SET manager_id = (SELECT id FROM users WHERE email = 'miguel.torres@company.com') 
WHERE email IN ('pedro.sanchez@company.com', 'fernanda.cruz@company.com', 'valeria.ramos@company.com');

UPDATE users SET manager_id = (SELECT id FROM users WHERE email = 'sarah.wilson@company.com') 
WHERE email IN ('carmen.flores@company.com', 'patricia.jimenez@company.com');

-- Mostrar resumen de usuarios creados
SELECT 
    role,
    COUNT(*) as cantidad,
    STRING_AGG(first_name || ' ' || last_name, ', ') as usuarios
FROM users 
GROUP BY role 
ORDER BY 
    CASE role
        WHEN 'champion' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'engineer' THEN 3
        WHEN 'technician' THEN 4
    END;