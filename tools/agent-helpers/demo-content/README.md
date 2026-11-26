# Forum demo dataset

`forum-demo.mjs` fills a local DSS Universe stack with `[demo]` forum content
**through the public GraphQL API only**. It creates:
- the category `demo` with sections `demo-general` and `demo-help`;
- four tags;
- five topics: short, long, question with an accepted answer, unanswered
  question, and a topic with a poll;
- 11 replies;
- 2 votes;
- a topic subscription and a section follow.

## Safety

- Dry run by default; writes need `--write`.
- The endpoint must be given explicitly (`--api` or `DEMO_API_URL`).
- No SQL, migrations, resets or deletions.
- Deterministic slugs and titles; every record is looked up first, so re-runs
  only fill gaps.
- Credentials come from env only and are never printed.
- Honours the API post cooldown (60 s between posts per account): a full run
  takes about 10 minutes.

## Requirements

- Two **different** accounts:
  - admin: rights to create categories, sections and tags;
  - member: an ordinary member.
- The seed accounts `admin@dss.local` and `user@dss.local` are enough on a dev
  database.
- Schema: current `main` migrations.

## Run

```sh
export DEMO_ADMIN_EMAIL=... DEMO_ADMIN_PASSWORD=... DEMO_MEMBER_EMAIL=... DEMO_MEMBER_PASSWORD=...
node tools/agent-helpers/demo-content/forum-demo.mjs --api http://localhost:3101/api/graphql          # dry run
node tools/agent-helpers/demo-content/forum-demo.mjs --api http://localhost:3101/api/graphql --write  # apply
```
