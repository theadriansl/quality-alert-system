-- Create table for lessons learned
-- Each 8D report can have multiple lessons learned entries
-- This allows us to track, query, and display all lessons learned across all 8D reports

CREATE TABLE IF NOT EXISTS lessons_learned (
  id SERIAL PRIMARY KEY,
  report_id VARCHAR(50) NOT NULL REFERENCES eightd_reports(report_id) ON DELETE CASCADE,
  lesson_text TEXT NOT NULL,
  category VARCHAR(100), -- e.g., 'Process Improvement', 'Quality Control', 'Communication', etc.
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_lessons_learned_report_id ON lessons_learned(report_id);
CREATE INDEX IF NOT EXISTS idx_lessons_learned_created_at ON lessons_learned(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_learned_category ON lessons_learned(category);

-- Comments for documentation
COMMENT ON TABLE lessons_learned IS 'Stores individual lessons learned from 8D reports';
COMMENT ON COLUMN lessons_learned.report_id IS 'Reference to the 8D report';
COMMENT ON COLUMN lessons_learned.lesson_text IS 'The actual lesson learned text';
COMMENT ON COLUMN lessons_learned.category IS 'Category of the lesson (optional)';
