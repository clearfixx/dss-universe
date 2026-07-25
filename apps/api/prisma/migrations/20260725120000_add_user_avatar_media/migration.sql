ALTER TABLE "users" ADD COLUMN "avatarMediaId" TEXT;

CREATE UNIQUE INDEX "users_avatarMediaId_key" ON "users"("avatarMediaId");

ALTER TABLE "users"
ADD CONSTRAINT "users_avatarMediaId_fkey"
FOREIGN KEY ("avatarMediaId") REFERENCES "media"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
