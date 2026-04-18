-- Create database (run this first as postgres superuser)
CREATE DATABASE apqp_system;

-- Connect to the apqp_system database and run the rest
\c apqp_system;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('champion', 'manager', 'engineer', 'technician')),
    department VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    extension VARCHAR(10),
    location VARCHAR(200),
    availability VARCHAR(100),
    emergency_contact VARCHAR(20),
    manager_id INTEGER REFERENCES users(id),
    can_assign BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Create teams table
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    program_name VARCHAR(255),
    customer VARCHAR(100),
    champion_id INTEGER REFERENCES users(id) NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create team_members table (many-to-many relationship)
CREATE TABLE team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_in_team VARCHAR(100),
    responsibilities TEXT[],
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Create APQP phases table
CREATE TABLE apqp_phases (
    id SERIAL PRIMARY KEY,
    phase_number INTEGER NOT NULL CHECK (phase_number BETWEEN 1 AND 5),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default APQP phases
INSERT INTO apqp_phases (phase_number, name, description) VALUES
(1, 'Plan & Define Program', 'Plan and define the program including team formation and project scope'),
(2, 'Product Design & Development Verification', 'Design and develop the product with verification activities'),
(3, 'Process Design & Development Verification', 'Design and develop the manufacturing process with verification'),
(4, 'Product & Process Validation', 'Validate both product and process before production launch'),
(5, 'Feedback, Assessment & Corrective Action', 'Ongoing feedback and continuous improvement');

-- Create APQP deliverables table
CREATE TABLE apqp_deliverables (
    id SERIAL PRIMARY KEY,
    phase_id INTEGER REFERENCES apqp_phases(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT TRUE,
    template_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert some common deliverables
INSERT INTO apqp_deliverables (phase_id, name, description) VALUES
(1, 'Team Charter', 'Document defining team members, roles, and responsibilities'),
(1, 'Program Timing', 'Master timeline for the entire APQP program'),
(1, 'Design Goals', 'Quality, reliability, and performance objectives'),
(2, 'DFMEA', 'Design Failure Mode and Effects Analysis'),
(2, 'Design Verification Plan', 'Plan for validating design requirements'),
(2, 'Product Specifications', 'Detailed product requirements and specifications'),
(3, 'PFMEA', 'Process Failure Mode and Effects Analysis'),
(3, 'Process Flow Chart', 'Manufacturing process flow diagram'),
(3, 'Control Plan', 'Process control and monitoring plan'),
(4, 'Production Trial Run', 'Trial production run results and analysis'),
(4, 'Measurement Systems Analysis', 'Gage R&R and measurement system validation'),
(5, 'Customer Satisfaction Report', 'Ongoing customer feedback and satisfaction metrics');

-- Create assignments table
CREATE TABLE assignments (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    deliverable_id INTEGER REFERENCES apqp_deliverables(id),
    assigned_to INTEGER REFERENCES users(id),
    assigned_by INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
    due_date DATE,
    completed_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_assignments_team_id ON assignments(team_id);
CREATE INDEX idx_assignments_assigned_to ON assignments(assigned_to);
CREATE INDEX idx_assignments_status ON assignments(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();