-- Projection-owned deletion evidence: no dependency on producer tables.
CREATE TABLE "activity_retractions" (
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "retractedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "activity_retractions_pkey" PRIMARY KEY ("subjectType", "subjectId")
);

-- Preserve known deletion evidence from already projected Wall entries.
-- Previously lost retractions cannot be reconstructed from this read model.
INSERT INTO "activity_retractions" ("subjectType", "subjectId", "retractedAt")
SELECT "subjectType", "subjectId", MIN("retractedAt")
FROM "activity_entries"
WHERE "subjectType" = 'UserWallPost' AND "retractedAt" IS NOT NULL
GROUP BY "subjectType", "subjectId";
