-- First, let's make sure we have the shifts table with the correct structure
CREATE TABLE IF NOT EXISTS shifts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    worker_name TEXT NOT NULL,
    shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'night')),
    shift_date DATE NOT NULL,
    is_working BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS if not already enabled
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Create or replace the RLS policy
CREATE POLICY "Enable all operations for authenticated users" ON shifts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Clean any existing data
TRUNCATE TABLE shifts CASCADE;

-- Insert test shifts
INSERT INTO shifts (worker_name, shift_type, shift_date, is_working, notes)
VALUES
    -- Today's shifts
    ('John', 'day', CURRENT_DATE, TRUE, 'Regular day shift'),
    ('Jane', 'night', CURRENT_DATE, TRUE, 'Regular night shift'),
    ('Smith', 'day', CURRENT_DATE, FALSE, 'RDO - Regular day off'),
    
    -- Tomorrow's shifts
    ('John', 'night', CURRENT_DATE + INTERVAL '1 day', TRUE, 'Covering for Alice'),
    ('Jane', 'day', CURRENT_DATE + INTERVAL '1 day', TRUE, 'Morning briefing'),
    ('Alice', 'day', CURRENT_DATE + INTERVAL '1 day', FALSE, 'Sick leave'),
    
    -- Day after tomorrow
    ('John', 'day', CURRENT_DATE + INTERVAL '2 days', TRUE, 'Project deadline'),
    ('Jane', 'night', CURRENT_DATE + INTERVAL '2 days', TRUE, 'Overnight monitoring'),
    ('Smith', 'day', CURRENT_DATE + INTERVAL '2 days', TRUE, 'Training day');

-- Create some shifts for next week
INSERT INTO shifts (worker_name, shift_type, shift_date, is_working)
SELECT
    worker_name,
    shift_type,
    shift_date + INTERVAL '7 days',
    TRUE
FROM
    shifts
WHERE
    shift_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days'; 