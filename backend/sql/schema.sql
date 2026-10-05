-- Add columns to existing complaints table
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS department_id TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS zone_id INTEGER;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'chennai';
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS sanctioned_by TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS sanction_remarks TEXT;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS completed_by TEXT;

ALTER TABLE complaints
    DROP CONSTRAINT IF EXISTS complaints_completed_requires_sanction;
ALTER TABLE complaints
    ADD CONSTRAINT complaints_completed_requires_sanction
    CHECK (NOT completed OR status = 'sanctioned');

-- Update projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS department_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS zone_id INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'chennai';

-- Index for department + zone queries
CREATE INDEX IF NOT EXISTS idx_complaints_dept_zone ON complaints(department_id, zone_id);
CREATE INDEX IF NOT EXISTS idx_complaints_city ON complaints(city);
COMMENT ON COLUMN complaints.zone_id IS
    'Administrative area ID: a GCC zone in Chennai or revenue division in Chengalpattu/Kancheepuram.';

-- Updated insert function
CREATE OR REPLACE FUNCTION insert_complaint(
    p_description TEXT,
    p_photo_url TEXT,
    p_lat FLOAT,
    p_lng FLOAT,
    p_problem_type TEXT,
    p_severity TEXT,
    p_confidence FLOAT,
    p_reasoning TEXT,
    p_department_id TEXT,
    p_zone_id INTEGER,
    p_city TEXT DEFAULT 'chennai'
) RETURNS SETOF complaints AS $$
    INSERT INTO complaints (
        description, photo_url, location, problem_type, severity,
        ai_confidence, ai_reasoning, department_id, zone_id, city
    ) VALUES (
        p_description, p_photo_url,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_problem_type, p_severity, p_confidence, p_reasoning,
        p_department_id, p_zone_id, p_city
    ) RETURNING *;
$$ LANGUAGE sql;

-- Public submissions upload photos through the backend using the configured
-- Supabase key. Keep uploads limited to the formats and size accepted by the API.
INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'complaint-photos',
    'complaint-photos',
    TRUE,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Allow complaint photo uploads'
    ) THEN
        CREATE POLICY "Allow complaint photo uploads"
            ON storage.objects
            FOR INSERT
            TO anon, authenticated
            WITH CHECK (bucket_id = 'complaint-photos');
    END IF;
END
$$;