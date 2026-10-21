# Authorization assignment reads

Authorization owns decisions and consumes separate role-permission and subject
assignment fact inputs. IAM owns role/permission queries, nested relation selection
and first-seen deduplication. Auth owns the opaque ID predicate; root infrastructure
assembles the unchanged independent subject-anchor operation.

Preserve no SQL for empty role names, missing subject to empty facts, every persisted
account state, unsorted relation reads and role-before-direct key concatenation.
There is no positive cache, new ACTIVE policy, transaction, pre-read or timeout.
Provider failures propagate. Existing guard/session checks remain authoritative.

Do not substitute the ordered IAM assignment reader from the independent-IAM
package. Its select and ordering are different. No credentials or profile fields
belong in either projection. Existing Core exports remain for the separate D4.4
surface review. Tests here compose actual owners; migrated E2E pins seven subject
SELECTs/two role-name SELECTs and new-read revocation evidence.
