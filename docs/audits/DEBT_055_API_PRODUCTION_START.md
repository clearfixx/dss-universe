# DEBT-055 — API compiled production entry

Date: 2026-10-22. Branch: `debt/d6-quality-baseline`.
Status: locally verified; remote CI/review open.

## Boundary and correction

Story: the built API is launched with its package production command, connects
to disposable PostgreSQL/Redis, and answers HTTP liveness/readiness. There is
no browser/UI change and this is not a deployment acceptance certificate.

The existing Nest build has `deleteOutDir: true`; a new build again emits
`apps/api/dist/src/main.js` and no `apps/api/dist/main.js`. The previous
`node dist/main` command cannot resolve its entry. Production start now uses
`node dist/src/main`; compiler settings, import rewriting and application code
are unchanged. No extra runtime loader or dependency is introduced.

The new post-build Node test reads the actual production command, restricts it
to a direct Node entry under the API dist directory, checks the compiled file
exists and asks Node to parse it. Root quality and CI run this after build.
This bounded regression does not pretend that syntax checking proves readiness.

## Actual process verification

A fresh API build and the post-build check pass. The real package command
`pnpm start:prod` was then launched with `NODE_ENV=production`, explicit
disposable5435/Redis6380 endpoints and synthetic required secrets. It used
port43155, verified unused before startup. No dev environment files were edited.
Outbox dispatch, scheduled News and Media cleanup timers were explicitly off;
telemetry was disabled and no AI/mail provider was contacted.

HTTP `GET /api/health/live` returned `status: ok`, `service: dss-api`.
HTTP `GET /api/health/ready` returned `status: ok`, database/redis/queues `up`.
Worker status was `unknown`: no Worker was launched or claimed verified here.

Only this owned smoke process was stopped after the requests. Its listening
port and PID disappeared and PostgreSQL reported zero remaining clients.
The full SDL SHA256 remained
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.
The primary checkout's dev server and dev DB5433 were not stopped or migrated.

Local logs retained in the temporary directory:
`dss-d6-production-build.log` and `dss-d6-production-start.log`.
Final `pnpm quality` naturally exited0 after the correction: formatting, lint,
typecheck, Prisma validation,33 profile controls, API1281/1281 in170 suites,
workspace tests, build, the new post-build regression and140/140 architecture
tests with zero findings. The final quality log is
`dss-d6-production-quality.log`. Generated SDL/client files have no diff.
The earlier same-source application coverage/E2E evidence belongs to DEBT-073;
the production command itself is additionally exercised by this real smoke.
Remote CI at the new checkpoint and phase review remain required before
acceptance; earlier green CI atc10c937 must not be attributed to this change.
