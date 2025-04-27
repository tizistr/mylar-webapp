-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (to ensure clean setup)
DROP TABLE IF EXISTS time_logs CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS samples CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Projects table for time tracking
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Samples table
CREATE TABLE samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    name TEXT NOT NULL,
    sample_type TEXT,
    collection_date DATE,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id),
    name TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,  -- Added for calendar compatibility
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Shifts table
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_name TEXT NOT NULL,
    shift_type TEXT CHECK (shift_type IN ('day', 'night')) NOT NULL,
    shift_mode TEXT CHECK (shift_mode = 'daily') NOT NULL,
    shift_date DATE NOT NULL,
    is_working BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Time Logs table
CREATE TABLE time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_name TEXT NOT NULL,
    log_date DATE NOT NULL,
    hours_worked NUMERIC(5,2) NOT NULL,
    project_id UUID REFERENCES projects(id),
    activity_description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Disable RLS for testing
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE samples DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs DISABLE ROW LEVEL SECURITY;

-- Add sample projects
INSERT INTO projects (name, description, location, start_date, end_date)
VALUES
    ('Alpine Metamorphism', 'Study of metamorphic rocks in the Alps', 'Swiss Alps', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year'),
    ('Volcanic Activity', 'Analysis of recent volcanic deposits', 'Sicily', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months');

-- Insert test shifts
INSERT INTO shifts (worker_name, shift_type, shift_mode, shift_date, notes)
VALUES
    ('Toti', 'day', 'daily', CURRENT_DATE, 'Full day shift'),
    ('Tizi', 'night', 'daily', CURRENT_DATE, 'Night shift'),
    ('Toti', 'day', 'daily', CURRENT_DATE + INTERVAL '1 day', 'Meeting day'),
    ('Tizi', 'day', 'daily', CURRENT_DATE + INTERVAL '2 days', 'Training day');

-- Insert sample time logs
INSERT INTO time_logs (worker_name, log_date, hours_worked, project_id, activity_description)
VALUES
    (
        'Toti', 
        CURRENT_DATE, 
        8.0,
        (SELECT id FROM projects WHERE name = 'Alpine Metamorphism' LIMIT 1),
        'Lab work'
    );

-- Insert sample data
INSERT INTO events (project_id, name, description, date, start_date, end_date)
VALUES
    (
        (SELECT id FROM projects WHERE name = 'Alpine Metamorphism' LIMIT 1),
        'Field Sample Collection',
        'Collecting rock samples from the Alps',
        CURRENT_DATE,
        CURRENT_TIMESTAMP + INTERVAL '1 week',
        CURRENT_TIMESTAMP + INTERVAL '1 week' + INTERVAL '8 hours'
    ),
    (
        (SELECT id FROM projects WHERE name = 'Volcanic Activity' LIMIT 1),
        'Lab Analysis',
        'XRD analysis of collected samples',
        CURRENT_DATE,
        CURRENT_TIMESTAMP + INTERVAL '2 weeks',
        CURRENT_TIMESTAMP + INTERVAL '2 weeks' + INTERVAL '6 hours'
    )
ON CONFLICT DO NOTHING; 