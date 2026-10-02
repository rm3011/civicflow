DROP TABLE IF EXISTS projects CASCADE;

CREATE TABLE projects (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    authority TEXT NOT NULL,
    work_type TEXT NOT NULL,
    location GEOGRAPHY(POINT) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'planned',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_location ON projects USING GIST (location);

CREATE OR REPLACE FUNCTION detect_all_conflicts()
RETURNS TABLE (
    project_a_id BIGINT, project_a_name TEXT,
    project_b_id BIGINT, project_b_name TEXT,
    distance_m FLOAT,
    authority_a TEXT, authority_b TEXT
)
LANGUAGE sql AS $$
    SELECT a.id, a.name, b.id, b.name,
           ST_Distance(a.location, b.location) AS distance_m,
           a.authority, b.authority
    FROM projects a
    JOIN projects b ON a.id < b.id
       AND a.start_date <= b.end_date
       AND a.end_date   >= b.start_date
       AND ST_DWithin(a.location, b.location, 100)
    ORDER BY distance_m;
$$;