-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM (
  'MENTIONS',
  'DIRECT_MESSAGES',
  'REPUTATION',
  'COMMENTS_REPLIES',
  'SUBSCRIPTIONS',
  'PUBLISHING_REVIEW',
  'SUPPORT'
);

-- CreateEnum
CREATE TYPE "NotificationDigestFrequency" AS ENUM ('OFF', 'DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "user_notification_preferences" (
  "userId" TEXT NOT NULL,
  "inAppCategories" "NotificationCategory"[] NOT NULL DEFAULT ARRAY[
    'MENTIONS',
    'DIRECT_MESSAGES',
    'REPUTATION',
    'COMMENTS_REPLIES',
    'SUBSCRIPTIONS',
    'PUBLISHING_REVIEW',
    'SUPPORT'
  ]::"NotificationCategory"[],
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailCategories" "NotificationCategory"[] NOT NULL DEFAULT ARRAY[
    'MENTIONS',
    'DIRECT_MESSAGES',
    'PUBLISHING_REVIEW',
    'SUPPORT'
  ]::"NotificationCategory"[],
  "digestFrequency" "NotificationDigestFrequency" NOT NULL DEFAULT 'OFF',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "user_notification_preferences"
ADD CONSTRAINT "user_notification_preferences_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
