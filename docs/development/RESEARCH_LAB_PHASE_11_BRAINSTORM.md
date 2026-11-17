# Research Lab — Phase 11 brainstorm

Status: proposal for product review; runtime implementation has not started.

## Accepted foundation

Research Lab is the single Wiki module. Knowledge Forge is its historical name;
the existing `KNOWLEDGE_FORGE_GUARDIAN` capability remains compatible. Phase 12's
reserved slot does not create another module. The finite D7 and stack reviews are
complete; the Auth UX bridge is already implemented.

The approved roadmap requires hierarchical categories, pages/manuals, tags,
internal links, Media references, immutable revisions, diff/edit summaries,
rollback, contributors, protected pages, discussions and search. Ordinary edits
require review. Guardians may review, publish, reject and roll back revisions;
this grants no general moderation or administration authority.

## Proposed first backend slice

Deliver categories, stable page identity and revision submission/review first.
Use the shared canonical EditorDocument and existing Media references. Root
composition connects narrow owner capabilities for current authorization,
profiles, document validation and Media; Research Lab owns its content workflow.
The existing Guardian decision is evidence for a Wiki operation, not permission
to bypass audience or account eligibility.

A page points to its published revision. Submitting an edit never overwrites the
published content. Each proposal records its author, base revision, edit summary
and immutable document. Acceptance records the reviewer and publishes that exact
proposal atomically with Audit/Outbox evidence. Rejection retains the proposal
and a reason. A rollback creates a new revision from an earlier document.

Concurrent proposals remain separate. Recommend rejecting publication against a
stale base with a controlled conflict so a reviewer cannot silently erase an
intervening accepted edit. Authors then submit a rebased proposal; automatic
merging and simultaneous collaborative editing are outside this first slice.

## Product decisions to settle before runtime

- Recommend one canonical published page per subject, with categories and tags
  for organization; manuals group ordered pages rather than duplicate documents.
- Approved: Guardians may publish their own proposals through an explicit
  publish action. Their revisions and audit evidence are preserved through the
  same workflow. Ordinary user proposals always require Guardian review.
- Recommend authenticated users submit proposals, guests read public published
  pages, and pending/rejected revisions remain visible only to their author and
  authorized reviewers. Decide whether all published revision history is public.
- Recommend protected pages limit submission to explicit Wiki capabilities;
  protection changes must be attributable and must not exclude the platform owner.

These recommendations require product approval, not inference from an existing
database field or a role name. Category audiences and module disable behavior
must follow the accepted platform policy when introduced.

## Delivery and verification

After workflow approval, specify API operations and additive persistence together
with authorization, stale-base concurrency and rollback tests. Coordinate the
API contract with the frontend owner before screen implementation. Subsequent
slices add navigation/manuals, safe search, discussions and integrations with
Activity, Notifications and the existing gamification pipeline. Search must not
expose pending, rejected, deleted or audience-restricted documents.

Existing module-local search can support the Wiki without claiming the deferred
shared Search Platform. Event names, target identities and scoring rules require
explicit owner contracts; no speculative automatic points are activated here.
