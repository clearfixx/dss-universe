-- Phase 7 profile foundation
ALTER TABLE "users"
ADD COLUMN "location" TEXT,
ADD COLUMN "website" TEXT,
ADD COLUMN "technologies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
