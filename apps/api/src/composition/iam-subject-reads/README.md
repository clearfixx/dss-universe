# Independent IAM subject reads

Root assembly binds IAM's existence input to Auth's authoritative Boolean contract.
Every persisted subject state is accepted by this existence check; this is not
authentication, eligibility or permission evidence. There is no cache.

Assignment reads merge Auth-owned ID/where fragments with IAM-owned relation
selection and mapping. One unchanged Prisma operation retains independent nested
queries, `assignedAt ASC` for roles/direct permissions, and unsorted role permission
keys. The application still sorts effective permission keys. Missing subject returns
null; an existing subject without assignments returns empty arrays.

No pre-read, new transaction, snapshot, timeout, state filter or business-facing ORM
contract is introduced. Guarded fragments stay in root infrastructure. Features do
not import each other. Persistence integration tests live here because they compose
real owned adapters; production IAM retains only its semantic dependencies.
