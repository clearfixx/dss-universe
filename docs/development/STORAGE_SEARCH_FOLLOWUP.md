# Storage and Search follow-up

Status: owner-authorized implementation and investigation, 2026-11-18.

## Owner instructions

- Implement operational S3/MinIO storage adapters.
- Owner clarification: implement a universal S3-compatible adapter. MinIO is a
  compatibility-test target, not the default production storage recommendation.
- Develop shared Search; evaluate Elasticsearch before selecting its engine.
- Preserve all hostile local OS-writer research for future deployment models.
  The research remains deferred and inactive; do not delete it.
- Do not audit all files for File Passport compliance. Legacy headers may be
  corrected when those files receive substantive edits. File Passport is not a
  result-acceptance criterion.

## Storage delivery boundary

New upload sessions use DSS_MEDIA_STORAGE_PROVIDER (LOCAL by default, S3 or
MINIO for a private S3-compatible endpoint). Set DSS_S3_BUCKET and DSS_S3_REGION
on the API and Worker. Set DSS_S3_ENDPOINT for a custom endpoint and
DSS_S3_FORCE_PATH_STYLE=true for a path-style endpoint. Supply credentials
through the standard AWS credential chain. Keep the same remote endpoint
for previously persisted remote bucket/key pairs. Switching the default to
LOCAL still requires remote configuration to access existing remote objects.

Remote jobs verify upload size and SHA-256 in an attempt-private staging
directory. ClamAV and the image processor consume the same snapshot. The
Worker publishes the resulting bytes before READY and removes the temporary
remote source after READY. A quarantined remote upload stays available to rescan. An adapter is operational only
when upload, quarantine/rescan, processing, original/variant persistence,
authorized delivery and reference-aware cleanup work with the selected backend.

Retain each object's persisted provider, bucket and storage key. A configuration
change selects storage for new uploads; it must not reinterpret existing LOCAL
objects or migrate their bytes automatically. API and Worker share transport
mechanics through storage infrastructure and keep business policy with Media.

Use private buckets. Configure credentials through environment/provider chains,
with an explicit endpoint and path-style option for MinIO. Authorization must
precede any delivery grant. Do not make quarantined originals publicly readable
or bypass scanning by allowing direct browser publication.

Deliver in bounded packages: shared object operations and MinIO integration
tests; API/Worker lifecycle integration; mixed-provider delivery/cleanup and
failure/retry regressions. Verify against a disposable object-store instance and
the existing quality gate before merge. No development objects are migrated.

## Search evaluation boundary

Compare PostgreSQL-backed indexing and Elasticsearch using actual requirements:
cross-module document identity, Unicode/query behavior, ranking, filters,
pagination, index rebuild and operating cost. Record the supported Elasticsearch
version, client compatibility and license/hosting implications before adoption.

Content owners publish safe projections and lifecycle events. Search owns the
index and query execution; it does not become the authority for access. An
audience change, revocation, deletion or disabled module must not expose hidden
documents through hits, snippets, counts, facets or suggestions. Define the
fresh authorization boundary and pagination semantics before implementation.

Use the existing durable event mechanisms for index updates and controlled
rebuilds. Preserve current News query behavior until its replacement is verified.
Research Lab integration consumes the shared contract once its workflow is
approved; it does not justify inventing Wiki data before that approval.
