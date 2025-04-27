-- Clear existing data
TRUNCATE TABLE shifts;

-- Insert test shifts for the current month
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

-- Insert some specific test shifts
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