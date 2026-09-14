CREATE TABLE "activity_feed_states" (
    "userId" TEXT NOT NULL,
    "lastVisitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_feed_states_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "activity_feed_states"
ADD CONSTRAINT "activity_feed_states_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
