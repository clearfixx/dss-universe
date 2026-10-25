# DEBT-013 — Local Mailpit recovery design

Status: owner-approved diagnosis/recovery package; design checkpoint only.
Branch: `debt/debt-013-mailpit-readiness`.
Accepted source baseline: `746d981`.

## Confirmed observations

- Compose declares loopback host1025/8025 to container1025/8025.
- Running Mailpit is healthy, but NetworkSettings has empty published mappings.
- Host1025 belongs to PID1432 (`services.exe`); host1026 is also occupied.
  These observations do not identify the underlying Windows service or prove
  why Docker lost its mappings. No foreign process is stopped.
- Candidate host2525/18025 have no current listener and are outside the observed
  IPv4/IPv6 excluded TCP ranges. This is not a guarantee against a later race.
- Container has no mounts. `docker diff` shows SQLite databases and WAL/SHM
  files under `/tmp`. Removing/recreating it could discard local mail history.

## Intended boundary

Keep container SMTP1025 and HTTP8025 unchanged. Publish SMTP on loopback2525
and mailbox UI on loopback18025, with explicit configurable host-port defaults.
API and Worker run on the host and must use the same MAIL_HOST/MAIL_PORT facts;
container-internal addressing must not be confused with the host mapping.
No application mail-provider behavior, credentials, product UI or dependency
upgrade belongs to this package.

## Recovery prerequisites and sequence

1. Recheck Compose ownership, endpoint availability and actual mail consumers.
   Inspect only required non-secret configuration fields; do not print env files.
2. Establish a supported, consistent mailbox preservation/export procedure for
   the installed Mailpit version. A live copy of a SQLite main file without its
   WAL is not adequate proof of preservation. Retain original container/storage
   until the preserved mailbox has been verified. Do not commit mailbox data.
3. Design persistent local mailbox storage and rollback before replacing the
   container. Do not use compose down, delete volumes, reset databases or restart
   PostgreSQL/Redis. Limit any approved service operation to Mailpit.
4. Apply the host-port and local consumer alignment as a separate implementation
   checkpoint after preservation is proven. Recheck ports immediately before bind.
5. Verify effective published mappings, bounded SMTP220/EHLO/QUIT and HTTP readyz.
   Then send only an explicitly synthetic local message and confirm retrieval,
   without external SMTP delivery or exposure of existing message contents.
6. Add focused configuration/readiness regressions and run the complete quality
   gate/CI on the candidate. Owner acceptance precedes merge.

## Current result and limits

Installed CLI help confirms `dump --http` and `ingest --smtp-addr` support.
The [official export guide](https://mailpit.axllent.org/docs/usage/import-export/)
documents API export for active instances; exported messages do not preserve
every mailbox database attribute. The
[storage guide](https://mailpit.axllent.org/docs/configuration/email-storage/)
distinguishes default temporary databases from explicit persistent storage.

A bounded internal API read returned total0/unread0. The attempted API dump
returned exit1, `no messages found`; this is not a successful backup. Existing
SQLite files do not prove they contain messages, and this active-mailbox count
does not certify older database files are empty. No existing content was printed.
Preservation of the older container files remains required before recreation.

No Compose/env edit, container stop/recreate, mailbox copy/export, external mail
or service installation has been performed by this checkpoint. Readiness remains
open. No Docker/WSL root cause is asserted. Existing D7 findings remain historical
evidence; this separate package does not accept D7 or start the stack audit.
