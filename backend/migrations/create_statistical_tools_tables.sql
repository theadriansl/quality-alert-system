-- Statistical Tools Module - Database Schema
-- Run this migration to create required tables

-- Datasets table
CREATE TABLE IF NOT EXISTS stat_datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    columns JSONB DEFAULT '[]',
    row_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dataset rows (flexible JSON storage)
CREATE TABLE IF NOT EXISTS stat_dataset_rows (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER REFERENCES stat_datasets(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    row_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analysis history (saved studies)
CREATE TABLE IF NOT EXISTS stat_analysis_history (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    analysis_type VARCHAR(50) NOT NULL, -- histogram, pareto, capability, spc, regression, gagerr, doe
    dataset_id INTEGER REFERENCES stat_datasets(id) ON DELETE SET NULL,
    parameters JSONB NOT NULL,
    results JSONB NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dataset_rows_dataset_id ON stat_dataset_rows(dataset_id);
CREATE INDEX IF NOT EXISTS idx_analysis_history_type ON stat_analysis_history(analysis_type);
CREATE INDEX IF NOT EXISTS idx_analysis_history_dataset ON stat_analysis_history(dataset_id);
