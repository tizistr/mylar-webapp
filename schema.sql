-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Potential ENUM types (Consider defining if applicable)
-- CREATE TYPE sample_type_enum AS ENUM ('Rock', 'Soil', 'Water', ...);
-- CREATE TYPE analysis_method_enum AS ENUM ('XRF', 'ICP-MS', ...);

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Samples table
CREATE TABLE samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    -- Consider using sample_type_enum instead of TEXT if types are predefined
    sample_type TEXT,
    collection_date DATE,
    location TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Thin Sections table
CREATE TABLE thin_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    mineral_composition JSONB,
    texture_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- XRD Analyses table
CREATE TABLE xrd_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    data_url TEXT,
    peaks JSONB,
    phases JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chemical Analyses table
CREATE TABLE chemical_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    -- Consider using analysis_method_enum instead of TEXT if methods are predefined
    method TEXT,
    results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    author TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- === Indexes ===

-- Indexes on foreign keys (often automatic in PG, but explicit)
CREATE INDEX IF NOT EXISTS idx_samples_project_id ON samples(project_id);
CREATE INDEX IF NOT EXISTS idx_thin_sections_sample_id ON thin_sections(sample_id);
CREATE INDEX IF NOT EXISTS idx_xrd_analyses_sample_id ON xrd_analyses(sample_id);
CREATE INDEX IF NOT EXISTS idx_chemical_analyses_sample_id ON chemical_analyses(sample_id);
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);

-- Indexes for common filtering/searching/sorting
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name); -- For searching projects by name
CREATE INDEX IF NOT EXISTS idx_samples_name ON samples(name); -- For searching samples by name
CREATE INDEX IF NOT EXISTS idx_reports_title ON reports(title); -- For searching reports by title
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC); -- For sorting projects by creation date
CREATE INDEX IF NOT EXISTS idx_samples_created_at ON samples(created_at DESC); -- For sorting samples by creation date
-- Consider adding indexes on other frequently queried columns (e.g., samples.collection_date, samples.sample_type)

-- Consider GIN indexes for JSONB columns if querying inside them frequently
-- CREATE INDEX IF NOT EXISTS idx_thin_sections_mineral_composition ON thin_sections USING GIN (mineral_composition);
-- CREATE INDEX IF NOT EXISTS idx_chemical_analyses_results ON chemical_analyses USING GIN (results);


-- === Triggers ===

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if NEW record is distinct from OLD record to avoid unnecessary updates
    IF row(NEW.*) IS DISTINCT FROM row(OLD.*) THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at column (No changes needed here)
-- Drop existing triggers before recreating to avoid duplication if script is run multiple times
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_samples_updated_at ON samples;
CREATE TRIGGER update_samples_updated_at
    BEFORE UPDATE ON samples
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_thin_sections_updated_at ON thin_sections;
CREATE TRIGGER update_thin_sections_updated_at
    BEFORE UPDATE ON thin_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_xrd_analyses_updated_at ON xrd_analyses;
CREATE TRIGGER update_xrd_analyses_updated_at
    BEFORE UPDATE ON xrd_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chemical_analyses_updated_at ON chemical_analyses;
CREATE TRIGGER update_chemical_analyses_updated_at
    BEFORE UPDATE ON chemical_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 