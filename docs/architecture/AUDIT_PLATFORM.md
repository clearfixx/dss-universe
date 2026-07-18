# Audit Platform

> Status: Phase 4 foundation implemented

Audit records are immutable security and operational evidence. They capture a stable action name, actor, target, result, reason, request/correlation linkage, network context, redacted metadata and occurrence time.

`AuditWriterService` accepts an existing database transaction. Sensitive state changes and their audit evidence therefore commit or roll back together. The first production integration is IAM permission creation; Auth, Media and moderation workflows must use the same contract as they are implemented.

Audit metadata is allowlisted by callers and recursively redacted before persistence. Keys associated with credentials, passwords, tokens, secrets, cookies, authorization values and hashes are never stored verbatim.

The platform exposes no update or delete application API. Retention and privileged search/export will be implemented through Security Deck and Mission Control policy, never by mutating historical records.
