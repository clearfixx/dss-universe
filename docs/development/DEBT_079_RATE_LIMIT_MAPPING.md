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

Constructor and existing formatter baseline: 14/14 pass. Targeted ESLint passed.
After the characterization gate terminated exit0, the real-AppModule Auth suite
passed 19/19 on disposable DB5434. It confirms the unchanged REST429 body and
GraphQL HTTP200 with RATE_LIMITED/statusCode429, unchanged public message and
unchanged lock/counter assertions. No Auth service is mocked.

The owner accepted characterization PR93, merged as `a8c71fa`; this separate
runtime branch incorporates that main. Its own full quality gate remains pending.
No concurrent DB gate or runtime-package acceptance/merge is claimed.
