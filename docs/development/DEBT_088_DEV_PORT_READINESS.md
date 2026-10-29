# DEBT-088 — Host-reserved development ports

Status: user-reported dev startup failure; scoped correction candidate.
Baseline: accepted main c6b5417; no UI, Windows or application policy changes.

The user's pnpm dev failed with Web EACCES on0.0.0.0:3000. Actual local probes
also reject3001; both belong to Windows TCP exclusion2928–3027.3200/3201 bind
successfully. Do not remove reservations or kill unrelated listeners.

Next reads its listener port before normal dotenv loading. The installed Next
CLI/environment guides and [official CLI reference](https://nextjs.org/docs/app/api-reference/cli/next)
confirm that PORT in an ordinary .env is insufficient. Web's dev command now
uses a thin Node24 CLI launcher to read only PORT from a dedicated ignored
.env.dev-port before Next. A direct Node env-file CLI flag was tested first,
but Next forwards it into restart NODE_OPTIONS where Node rejects it; the raw
failed startup log is retained. The launcher passes PORT through the child env,
without forwarding that flag or preloading unrelated dotenv values.
This file is only for listener configuration (PORT=3200). No global PORT shared
with API is introduced. Without that file defaults stay3000;
explicit Next CLI --port still works, including isolated quality smoke3195.
Normal Next dotenv ordering/expansion remains intact for all other app variables.

Local setup must align Web origin3200, API PORT3201, NEXT_PUBLIC_API_URL and
NEXT_PUBLIC_GRAPHQL_URL, API WEB_ORIGINS and API/Worker reset/verification links.
Only these named local env fields are changed; credentials and unrelated keys
are preserved. The untracked owner stack-audit plan must stay unchanged. No
dev-database migration/reset, dependency update or SMTP recovery is part of this
startup correction. Mailpit's separate candidate is retained on its own branch.

Acceptance requires actual root pnpm dev startup plus Web/API readiness and CORS
verification, and full quality/CI before merge. This document does not claim
those checks have completed or authorize Phase11. Runtime/API/UI behavior is
unchanged apart from selecting explicitly configured local listener endpoints.
