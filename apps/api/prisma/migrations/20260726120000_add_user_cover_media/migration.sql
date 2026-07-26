-- AlterTable
ALTER TABLE "users" ADD COLUMN "coverMediaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_coverMediaId_key" ON "users"("coverMediaId");

-- AddForeignKey
ALTER TABLE "users"
ADD CONSTRAINT "users_coverMediaId_fkey"
FOREIGN KEY ("coverMediaId") REFERENCES "media"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
