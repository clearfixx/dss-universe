# DEBT-079 — Explicit login rate-limit mapping

Date: 2026-10-26. Separate runtime package, explicitly approved by the owner.
Based on characterization PR93 head `7a86b91`; it does not imply acceptance or
merge of that PR.

## Scope

LoginRateLimitedException now carries an explicit message/statusCode429 object
instead of a string. This supplies the existing GraphQL formatter with the
status needed to emit RATE_LIMITED rather than INTERNAL_SERVER_ERROR. The
existing REST body remains message/statusCode429, without a new error field.
GraphQL remains HTTP200; public text is unchanged. No abuse thresholds, counters,
lock expiry, Retry-After policy, global formatter or successful API changes.

The class remains Nest-coupled in Domain: this narrow transport correction does
not close the broader DEBT-079 architecture work. Historical characterization
evidence in the design document describes the pre-correction behavior.

## Verification

Constructor and existing formatter baseline: 14/14 pass. Real HTTP assertions
were updated to the approved RATE_LIMITED/statusCode429 contract; their execution
and the full quality gate remain pending until the other checkout's DB gate ends.
No parallel DB gate or merge has been performed.
