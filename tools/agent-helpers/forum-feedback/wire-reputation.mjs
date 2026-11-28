import { appendFileSync } from "node:fs";
import { sub } from "./sub.mjs";

sub(
  "apps/api/src/modules/reputation/presentation/graphql/models/reputation.model.ts",
  `  @Field(() => Int)
  score!: number;
}`,
  `  @Field(() => Int)
  score!: number;

  @Field({ description: 'true when the viewer may cancel entries.' })
  viewerCanReverse!: boolean;
}`,
);

const operations = "apps/web/src/graphql/operations/reputation.graphql";
sub(
  operations,
  `    score
    total
    page
    totalPages
    items {
      id
      value
      reason
      createdAt
      actor {`,
  `    score
    total
    page
    totalPages
    viewerCanReverse
    items {
      id
      value
      reason
      createdAt
      actor {`,
);
appendFileSync(
  operations,
  `
mutation ReverseReputationEntry($input: ReverseReputationInput!) {
  reverseReputation(input: $input) {
    id
  }
}
`,
);

const actions = "apps/web/src/features/forum/forum-actions.ts";
sub(
  actions,
  `/** Edit history of a post: who and when; texts for the author and staff. */`,
  `/** Cancels a reputation change; the API requires \`reputation.reverse\`. */
export async function reverseReputationEntry(
  entryId: string,
  reason: string,
  path: string,
) {
  return run(
    ReverseReputationEntryDocument,
    { input: { entryId, reason } },
    (data) => data.reverseReputation,
    path,
  );
}

/** Edit history of a post: who and when; texts for the author and staff. */`,
);
sub(
  actions,
  `  ReputationJournalDocument,`,
  `  ReputationJournalDocument,
  ReverseReputationEntryDocument,`,
);

const ui = "apps/web/src/features/forum/forum-author-reputation.tsx";
sub(
  ui,
  ` * One change per member per post and the account-age rule are enforced by
 * the API.`,
  ` * Moderators and administrators cancel a change from the journal, with a
 * reason. One change per member per post (a cancelled one counts too) and
 * the account-age rule are enforced by the API.`,
);
sub(
  ui,
  `import { getReputationJournal, giveForumPostReputation } from "./forum-actions";`,
  `import {
  getReputationJournal,
  giveForumPostReputation,
  reverseReputationEntry,
} from "./forum-actions";`,
);
sub(
  ui,
  `  const own = viewerId === authorId;`,
  `  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);

  const own = viewerId === authorId;`,
);
sub(
  ui,
  `  function showJournal(next: boolean) {
    setJournalOpen(next);`,
  `  function startCancel(entryId: string | null) {
    setCancelling(entryId);
    setCancelReason("");
    setCancelError(null);
  }

  function cancelEntry(entryId: string, entryValue: number) {
    const invalid = reputationReasonError(cancelReason);
    if (invalid) {
      setCancelError(invalid);
      return;
    }
    start(async () => {
      const result = await reverseReputationEntry(
        entryId,
        cancelReason.trim(),
        path,
      );
      if (!result.ok) {
        setCancelError(
          "Не вдалося скасувати. Можливо, зміну вже скасовано.",
        );
        return;
      }
      setScore((current) => current - entryValue);
      startCancel(null);
      setJournal(await getReputationJournal(authorId));
    });
  }

  function showJournal(next: boolean) {
    setJournalOpen(next);
    if (!next) startCancel(null);`,
);
sub(
  ui,
  `                    {item.reversal ? (
                      <p className="text-xs text-slate-400">
                        Скасовано модератором: {item.reversal.reason}
                      </p>
                    ) : null}`,
  `                    {item.reversal ? (
                      <p className="text-xs text-slate-400">
                        Скасовано модератором: {item.reversal.reason}
                      </p>
                    ) : null}
                    {!item.reversal && journal.data.viewerCanReverse ? (
                      cancelling === item.id ? (
                        <div className="space-y-1.5">
                          <input
                            value={cancelReason}
                            onChange={(event) =>
                              setCancelReason(event.target.value)
                            }
                            maxLength={REPUTATION_REASON_MAX}
                            autoFocus
                            aria-label="Причина скасування"
                            placeholder="Причина скасування"
                            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white outline-none focus:border-violet-400/60"
                          />
                          {cancelError ? (
                            <p role="alert" className="text-xs text-rose-300">
                              {cancelError}
                            </p>
                          ) : null}
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={pending}
                              onClick={() => cancelEntry(item.id, item.value)}
                            >
                              Скасувати зміну
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => startCancel(null)}
                            >
                              Не скасовувати
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startCancel(item.id)}
                          className="justify-self-start text-xs text-rose-300 hover:underline"
                        >
                          Скасувати зміну репутації
                        </button>
                      )
                    ) : null}`,
);
