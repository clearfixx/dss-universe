-- Private opaque inventory IDs have bytewise order, independent of database locale.
-- Only the two new O1 inventory indexes are replaced; accepted baseline indexes remain.
DROP INDEX "achievement_source_inventory_idx";
DROP INDEX "achievement_event_inventory_idx";
CREATE INDEX "achievement_source_inventory_idx" ON "achievement_awards"("sourceType", "sourceId", "kind", "id" COLLATE "C");
CREATE INDEX "achievement_event_inventory_idx" ON "achievement_awards"("sourceEventId", "kind", "id" COLLATE "C");

CREATE OR REPLACE FUNCTION protect_achievement_source_cursor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Achievement source history cannot be deleted'; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW."id", NEW."producer", NEW."sourceKind", NEW."sourceId", NEW."createdAt")
      IS DISTINCT FROM ROW(OLD."id", OLD."producer", OLD."sourceKind", OLD."sourceId", OLD."createdAt") THEN
      RAISE EXCEPTION 'Achievement source identity is immutable';
    END IF;
    IF NEW."appliedRevision" < OLD."appliedRevision" OR NEW."targetRevision" < OLD."targetRevision" OR
      NEW."retiredThrough" < OLD."retiredThrough" OR NEW."pendingRetiredThrough" < OLD."pendingRetiredThrough" OR
      NEW."generation" < OLD."generation" OR NEW."progress" < OLD."progress" THEN
      RAISE EXCEPTION 'Achievement source progress cannot decrease';
    END IF;
    IF NEW."targetRevision" > OLD."targetRevision" AND NEW."generation" <= OLD."generation" THEN
      RAISE EXCEPTION 'Achievement source target needs a new generation';
    END IF;
    IF NEW."generation" = OLD."generation" AND OLD."retirementAfterRevision" IS NOT NULL AND
      (NEW."retirementAfterRevision" IS NULL OR
       (NEW."retirementAfterRevision", NEW."retirementAfterAwardId") <
       (OLD."retirementAfterRevision", OLD."retirementAfterAwardId")) THEN
      RAISE EXCEPTION 'Achievement retirement reset needs a new generation';
    END IF;
    IF NEW."generation" = OLD."generation" AND OLD."inventoryAfterId" IS NOT NULL AND
      (NEW."inventoryAfterId" IS NULL OR
       NEW."inventoryAfterId" COLLATE "C" < OLD."inventoryAfterId" COLLATE "C") THEN
      RAISE EXCEPTION 'Achievement inventory reset needs a new generation';
    END IF;
  END IF;
  IF NEW."targetRevision" > 0 AND NOT EXISTS (
    SELECT 1 FROM "achievement_source_facts" f WHERE f."cursorId" = NEW."id" AND f."revision" = NEW."targetRevision"
  ) THEN RAISE EXCEPTION 'Achievement target requires its immutable fact'; END IF;
  IF NEW."appliedRevision" > 0 AND NOT EXISTS (
    SELECT 1 FROM "achievement_source_facts" f WHERE f."cursorId" = NEW."id" AND f."revision" = NEW."appliedRevision"
  ) THEN RAISE EXCEPTION 'Achievement applied revision requires its immutable fact'; END IF;
  RETURN NEW;
END $$;
