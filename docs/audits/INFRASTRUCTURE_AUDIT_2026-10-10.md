# DSS Universe — Infrastructure and Environment Audit

> Status: Static audit complete; live service verification blocked
>
> Date: 2026-10-10
>
> Host observed: Windows, Node 22.22.3, pnpm 11.9.0

## Executive result

The repository cannot currently provide a deterministic local development
environment matching its implemented features.

- Docker daemon is not running;
- Compose defines PostgreSQL, Redis and pgAdmin only;
- MinIO/S3, ClamAV, SMTP catcher and an OTLP backend are absent;
- root and API local environment files are behind their examples;
- Worker has no environment template or validation/bootstrap path;
- Web defaults to API port 4000 while onboarding and API examples use 3001;
- the documented bootstrap script is Bash-only and contains invalid package
  filters;
- local Compose does not provide the isolated test PostgreSQL/Redis topology
  used by CI;
- Compose health checks and deterministic pgAdmin image pinning are absent;
- GitHub CLI is unavailable, while remote read access alone is proven.

Node 24.18.0, Docker, SMTP, ClamAV, MinIO/S3 and telemetry delivery cannot be
declared healthy until live checks are executed.

## Runtime and tooling inventory

| Capability       | Observed state         | Acceptance requirement                          |
| ---------------- | ---------------------- | ----------------------------------------------- |
| Node.js          | 22.22.3                | Exactly 24.18.0                                 |
| pnpm             | 11.9.0 via Corepack    | Frozen-lockfile install under Node 24           |
| Docker CLI       | Installed              | Linux daemon healthy                            |
| Docker daemon    | Unavailable            | Compose services healthy                        |
| Git remote read  | Verified               | Retain                                          |
| Git remote write | Unverified             | Push a phase branch                             |
| GitHub CLI       | Missing                | Authenticated PR/CI access                      |
| PostgreSQL/Redis | Declared only          | Live health plus disposable test instances      |
| pgAdmin          | Declared with `latest` | Pin or explicitly accept floating dev tooling   |
| ClamAV           | Absent                 | Healthy scanner and EICAR verification          |
| SMTP catcher     | Absent                 | Local delivery and message inspection           |
| MinIO/S3         | Absent                 | Decide scope, then contract/health verification |
| OTLP backend     | Absent                 | Optional documented fallback or local collector |

## Environment contract drift

Only variable names were compared; secret values were not read into audit
output.

### Root environment

The root example contains 41 keys while the local root file contains 8. The
local file is missing 33 example keys, including application, database URL,
JWT, Media signing/retention, Auth protection/2FA, ClamAV, AI and Mail settings.

The root file is documented as Docker-only, but its example also contains API
and Worker configuration. Docker Compose does not inject those values into
locally launched processes, and a `.env` file is not automatically exported to
PowerShell or Bash.

### API environment

The API example contains 25 keys while the local API file contains 14. Missing
keys are:

- `AUTH_2FA_ENCRYPTION_KEY`;
- four login-protection settings;
- `EMAIL_VERIFICATION_WEB_URL`;
- `MAIL_FROM`;
- `OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`;
- `PASSWORD_RESET_WEB_URL`.

Several settings used by API validation are present only in the root example,
including `MEDIA_SIGNING_SECRET`, scheduler/retention intervals and log level.
The examples therefore do not define one complete application contract.

### Worker environment

Worker reads database, Redis, log, uploads, ClamAV, SMTP and Web URL variables
directly from `process.env`. It has no `.env.example`, schema validation or
explicit dotenv loading. `pnpm dev` runs the Worker from its package directory;
the root `.env` is not a reliable Worker configuration mechanism.

`DATABASE_URL` may therefore be undefined, Redis silently defaults to 6379, and
mail workers silently disable themselves. This prevents “started” from meaning
“operational”. Worker startup must validate required capabilities and report
intentional optional fallbacks explicitly.

## Port and endpoint drift

- onboarding expects API `http://localhost:3001`;
- API example sets `PORT=3001`;
- API `main.ts` fallback is 4000;
- Web `site.config.ts` defaults API and GraphQL URLs to port 4000;
- root example uses `API_PORT`, but API runtime reads `PORT`;
- `API_GLOBAL_PREFIX` is declared but API startup uses a code-owned prefix.

Web has no environment example. A default checkout may therefore render against
a different endpoint than the documented API. The fix should establish one
canonical port contract and generate/document application-specific examples;
it should not add another fallback.

## Compose topology

Current Compose provides only PostgreSQL, Redis and pgAdmin. It lacks health
checks. pgAdmin depends on container start, not PostgreSQL readiness. The
`dpage/pgadmin4:latest` tag also makes onboarding non-reproducible.

CI uses a distinct test topology:

- PostgreSQL `dss_test` on host port 5433;
- Redis on host port 6380;
- health checks for both.

Local Compose uses the development database on 5433 and Redis on 6379, so it
cannot simultaneously satisfy the test defaults without collision or manual
reconfiguration. A separate disposable test profile/project is required.

## Bootstrap defects

`scripts/bootstrap.sh` does not satisfy the documented onboarding contract:

- there is no Windows/PowerShell equivalent despite Windows being officially
  supported;
- it checks tool presence but not pinned versions;
- it runs `pnpm install` without `--frozen-lockfile`;
- it uses `pnpm --filter api`, while the package name is `@dss/api`;
- it starts services without waiting for health;
- it does not configure or validate Worker/Web environments;
- it does not start ClamAV, SMTP, MinIO or observability;
- it reports “ALL SYSTEMS NOMINAL” without application health, Worker health or
  test verification.

The script must fail truthfully instead of presenting partial startup as a
ready workstation.

## CI parity

CI has healthier PostgreSQL/Redis readiness than local Compose, but its clean
checkout ordering is currently suspect: lint and typecheck run before any
explicit `@dss/editor` build even though that package exports only `dist`.

CI also runs a high-severity dependency audit that currently has known critical
and high findings. Until a fresh remote run is observed, workflow presence is
not evidence that CI is green.

## Storage and malware infrastructure

The API and Worker are hard-wired to local filesystem storage. The Worker rejects
non-local provider identities. ClamAV is mandatory in the processing path but
is not locally provisioned.

The Windows path-containment defect also exists in API
`LocalStorageProvider`, in addition to both Worker storage consumers. All three
check only `../` after `path.relative()` and therefore miss Windows `..\\`.
DEBT-020 must cover the entire local storage boundary.

## Observability

The API initializes OpenTelemetry auto-instrumentation and structured Pino
logging, but no exporter/collector topology is configured. Without an exporter,
instrumentation initialization alone does not prove traces or metrics leave the
process. Worker has structured logs but no equivalent telemetry lifecycle or
health surface.

The desired local mode must be explicit: either an optional OTLP
collector/backend profile with no-op fallback, or a required collector with
startup failure when unavailable.

## Proposed D0 implementation sequence

1. Install/select Node 24.18.0 and verify Corepack/pnpm 11.9.0.
2. Repair Docker Desktop and verify the daemon.
3. Freeze one environment-variable inventory per application.
4. Add Worker and Web examples plus schema validation where applicable.
5. Align API/Web ports and remove contradictory variable names.
6. Add health-checked development Compose services.
7. Add a disposable test Compose profile/project matching CI ports and names.
8. Add SMTP catcher and ClamAV; verify real mail and EICAR flows.
9. Decide MinIO/S3 scope before adding a service that runtime cannot use.
10. Define optional OTLP topology and verify exported telemetry.
11. Repair cross-platform bootstrap commands and truthful readiness checks.
12. Install/authenticate GitHub CLI, verify push, open the audit PR and observe
    CI.

Recommended model: `gpt-6.1-sol` high for topology and contract design. Use a
lower-cost model for approved env/template/script mechanics.

## Infrastructure acceptance matrix

| Requirement           | Proof required                                             |
| --------------------- | ---------------------------------------------------------- |
| Pinned runtime        | Node and pnpm versions printed by bootstrap                |
| Deterministic install | Clean frozen-lockfile install                              |
| Development services  | Docker health checks pass                                  |
| Disposable test data  | Independent DB/Redis project can be destroyed safely       |
| API                   | Health reports app and database up                         |
| Worker                | Startup/readiness proves DB, Redis and enabled processors  |
| SMTP                  | Verification, recovery and alert messages captured locally |
| ClamAV                | Clean sample and EICAR sample produce expected states      |
| Storage               | Local security tests pass; MinIO/S3 matches approved scope |
| Observability         | Signal observed or documented no-op mode                   |
| GitHub                | Auth, push, PR and CI visibility verified                  |
| Documentation         | Onboarding reproduces the same result on Windows and CI    |
