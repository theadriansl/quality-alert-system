-- Script para crear la tabla de team_presets (atajos de equipo)
-- Ejecutar después de crear la tabla users

-- Create team_presets table
CREATE TABLE IF NOT EXISTS team_presets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preset_name VARCHAR(100) NOT NULL,
    issue_user_ids INTEGER[] DEFAULT '{}',
    countermeasure_user_ids INTEGER[] DEFAULT '{}',
    confirmation_user_ids INTEGER[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, preset_name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_team_presets_user_id ON team_presets(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_team_presets_updated_at BEFORE UPDATE ON team_presets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to limit 3 presets per user
CREATE OR REPLACE FUNCTION check_preset_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM team_presets WHERE user_id = NEW.user_id) >= 3 THEN
        RAISE EXCEPTION 'User cannot have more than 3 team presets';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_preset_limit
    BEFORE INSERT ON team_presets
    FOR EACH ROW
    EXECUTE FUNCTION check_preset_limit();

COMMENT ON TABLE team_presets IS 'Stores user-specific team configuration presets for quick loading in 8D workflow';
COMMENT ON COLUMN team_presets.issue_user_ids IS 'Array of user IDs assigned to Issue Section (D3)';
COMMENT ON COLUMN team_presets.countermeasure_user_ids IS 'Array of user IDs assigned to Countermeasure Section (D4-D5)';
COMMENT ON COLUMN team_presets.confirmation_user_ids IS 'Array of user IDs assigned to Confirmation Section (D6-D7)';
