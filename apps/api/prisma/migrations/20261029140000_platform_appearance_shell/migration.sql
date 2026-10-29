CREATE TYPE "ShellVariant" AS ENUM ('MODULE_LAUNCHER', 'HORIZONTAL_NAVIGATION', 'HYBRID');

CREATE TABLE "platform_appearance_settings" (
  "id" TEXT NOT NULL,
  "activeShellVariant" "ShellVariant" NOT NULL DEFAULT 'MODULE_LAUNCHER',
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_appearance_settings_pkey" PRIMARY KEY ("id")
);
