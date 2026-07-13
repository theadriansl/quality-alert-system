-- Migration 067: Add audit_number to audit_requests
ALTER TABLE audit_requests
  ADD COLUMN IF NOT EXISTS audit_number VARCHAR(30);

-- Backfill existing rows with sequential numbers per year
WITH numbered AS (
  SELECT id,
         EXTRACT(YEAR FROM created_at)::int AS yr,
         ROW_NUMBER() OVER (
           PARTITION BY EXTRACT(YEAR FROM created_at)
           ORDER BY created_at, id
         ) AS rn
  FROM audit_requests
  WHERE audit_number IS NULL
)
UPDATE audit_requests ar
SET audit_number = 'AUDREQ-' || n.yr || '-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE ar.id = n.id;
