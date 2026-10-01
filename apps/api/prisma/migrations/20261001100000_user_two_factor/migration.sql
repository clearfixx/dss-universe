CREATE TABLE "user_two_factor" (
  "userId" TEXT NOT NULL,
  "encryptedSecret" TEXT NOT NULL,
  "recoveryCodeHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "enabledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_two_factor_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "user_two_factor"
  ADD CONSTRAINT "user_two_factor_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
