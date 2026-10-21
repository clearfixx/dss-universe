CREATE INDEX "sessions_userId_revokedAt_expiresAt_idx"
ON "sessions" ("userId", "revokedAt", "expiresAt");
