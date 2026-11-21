-- CreateEnum
CREATE TYPE "PollVisibility" AS ENUM ('OPEN', 'ANONYMOUS');

-- CreateTable
CREATE TABLE "polls" (
    "id" TEXT NOT NULL,
    "interactionTargetId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "visibility" "PollVisibility" NOT NULL,
    "maxChoices" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_options" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_ballots" (
    "pollId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_ballots_pkey" PRIMARY KEY ("pollId","voterId")
);

-- CreateTable
CREATE TABLE "poll_ballot_choices" (
    "pollId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "poll_ballot_choices_pkey" PRIMARY KEY ("pollId","voterId","optionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "polls_interactionTargetId_key" ON "polls"("interactionTargetId");

-- CreateIndex
CREATE UNIQUE INDEX "poll_options_pollId_position_key" ON "poll_options"("pollId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "poll_options_id_pollId_key" ON "poll_options"("id", "pollId");

-- CreateIndex
CREATE INDEX "poll_ballots_voterId_castAt_idx" ON "poll_ballots"("voterId", "castAt");

-- CreateIndex
CREATE INDEX "poll_ballot_choices_pollId_optionId_idx" ON "poll_ballot_choices"("pollId", "optionId");

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_interactionTargetId_fkey" FOREIGN KEY ("interactionTargetId") REFERENCES "interaction_targets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_ballots" ADD CONSTRAINT "poll_ballots_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_ballots" ADD CONSTRAINT "poll_ballots_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_ballot_choices" ADD CONSTRAINT "poll_ballot_choices_pollId_voterId_fkey" FOREIGN KEY ("pollId", "voterId") REFERENCES "poll_ballots"("pollId", "voterId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_ballot_choices" ADD CONSTRAINT "poll_ballot_choices_optionId_pollId_fkey" FOREIGN KEY ("optionId", "pollId") REFERENCES "poll_options"("id", "pollId") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Poll invariants
ALTER TABLE "polls"
  ADD CONSTRAINT "polls_question_length"
    CHECK (char_length(btrim("question")) BETWEEN 3 AND 300),
  ADD CONSTRAINT "polls_max_choices_bounds"
    CHECK ("maxChoices" BETWEEN 1 AND 20);

ALTER TABLE "poll_options"
  ADD CONSTRAINT "poll_options_label_length"
    CHECK (char_length(btrim("label")) BETWEEN 1 AND 200),
  ADD CONSTRAINT "poll_options_position_bounds"
    CHECK ("position" BETWEEN 0 AND 19);

-- Polls, options and cast ballots are immutable: a vote cannot be changed.
CREATE FUNCTION prevent_poll_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Poll % rows are immutable.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "polls_immutable"
BEFORE UPDATE OR DELETE ON "polls"
FOR EACH ROW EXECUTE FUNCTION prevent_poll_history_mutation();

CREATE TRIGGER "poll_options_immutable"
BEFORE UPDATE OR DELETE ON "poll_options"
FOR EACH ROW EXECUTE FUNCTION prevent_poll_history_mutation();

CREATE TRIGGER "poll_ballots_immutable"
BEFORE UPDATE OR DELETE ON "poll_ballots"
FOR EACH ROW EXECUTE FUNCTION prevent_poll_history_mutation();

CREATE TRIGGER "poll_ballot_choices_immutable"
BEFORE UPDATE OR DELETE ON "poll_ballot_choices"
FOR EACH ROW EXECUTE FUNCTION prevent_poll_history_mutation();

/*
 * A ballot is a promise made once. The database keeps it that way.
 */
