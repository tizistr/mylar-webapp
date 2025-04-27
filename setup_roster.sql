-- Enable UUID extension (required for ID generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing shifts table if it exists
DROP TABLE IF EXISTS shifts;

-- Create the shifts table
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_name TEXT NOT NULL,
    shift_type TEXT CHECK (shift_type IN ('day', 'night')) NOT NULL,
    shift_date DATE NOT NULL,
    is_working BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS)
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON shifts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Insert test data for the current month
WITH dates AS (
    SELECT generate_series(
        date_trunc('month', CURRENT_DATE)::date,
        (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date,
        '1 day'::interval
    )::date as shift_date
)
INSERT INTO shifts (worker_name, shift_type, shift_date, is_working, notes)
SELECT
    CASE WHEN random() > 0.5 THEN 'Toti' ELSE 'Tizi' END as worker_name,
    CASE WHEN random() > 0.5 THEN 'day' ELSE 'night' END as shift_type,
    d.shift_date,
    true as is_working,
    'Regular shift' as notes
FROM dates d
WHERE extract(dow from d.shift_date) < 6;  -- Only weekdays

-- Insert some specific test shifts for today
INSERT INTO shifts (worker_name, shift_type, shift_date, notes)
VALUES
    (
        'Toti',
        'day',
        CURRENT_DATE,
        'Morning shift'
    ),
    (
        'Tizi',
        'night',
        CURRENT_DATE,
        'Evening shift'
    ); 