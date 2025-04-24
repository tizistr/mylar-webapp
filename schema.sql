-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
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
    sample_id UUID REFERENCES samples(id) ON DELETE CASCADE,
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
    sample_id UUID REFERENCES samples(id) ON DELETE CASCADE,
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
    sample_id UUID REFERENCES samples(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    method TEXT,
    results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    author TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_samples_project_id ON samples(project_id);
CREATE INDEX idx_thin_sections_sample_id ON thin_sections(sample_id);
CREATE INDEX idx_xrd_analyses_sample_id ON xrd_analyses(sample_id);
CREATE INDEX idx_chemical_analyses_sample_id ON chemical_analyses(sample_id);
CREATE INDEX idx_reports_project_id ON reports(project_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at column
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_samples_updated_at
    BEFORE UPDATE ON samples
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_thin_sections_updated_at
    BEFORE UPDATE ON thin_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_xrd_analyses_updated_at
    BEFORE UPDATE ON xrd_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chemical_analyses_updated_at
    BEFORE UPDATE ON chemical_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 