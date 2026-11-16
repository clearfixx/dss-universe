-- Expand only the supported codec set. Existing admissions, receipts, their
-- immutable projections and completion flags are neither rewritten nor replayed.
ALTER TABLE gamification_admissions DROP CONSTRAINT gamification_admission_shape;
ALTER TABLE gamification_admissions ADD CONSTRAINT gamification_admission_shape CHECK (
  "descriptorId" ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
  AND "descriptorVersion">0 AND "codecVersion" IN (1,2)
  AND jsonb_typeof(projection)='object'
  AND octet_length("projectionDigest")=32
  AND "encodedBytes" BETWEEN 1 AND 262144
  AND octet_length(projection::text)<=524288
);
