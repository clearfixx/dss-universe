# Permanent ban and appeals

Status: package 1 (ban, lift, login ticket, notice) implemented 2026-11-27.
Packages 2 to 4 are not started.

## Owner decisions

- A permanent ban removes all access, reading included. Only an administrator
  or the owner issues and lifts it. The owner cannot be banned; only the owner
  bans an administrator.
- After signing in, a banned user sees only the ban screen (owner mockup,
  Ukrainian text with an apology): date and time, who banned, where, which
  community rule, reference number, and the appeal form.
- One appeal per ban. Pending: "already submitted, under review". Rejected:
  the rejection reason is shown and no resubmission is possible. Accepted: the
  ban is lifted.
- Appeal files ship in the first version: up to 5 files, 10 MB each. Images
  only (screenshots): JPG, JPEG, PNG, WebP. No other file types.
- Administrators and the owner review appeals in a Command Deck section.
- Rules come from the community rules catalogue (merged in #267).

## Design

### Access: ban ticket, not a session

Sessions keep requiring an `ACTIVE` account; no exception is added.

- Banning sets `BANNED`, increments `authVersion` and revokes every session in
  the same transaction.
- Login with a correct password (and second factor when enabled) for a
  `BANNED` account fails with a short-lived ban ticket. The ticket is signed
  with a key derived for this purpose only, so it is neither an access nor a
  refresh token.
- The ticket authorizes exactly: read the own ban notice, upload appeal files,
  submit the appeal. Each use re-checks that the account is still `BANNED`.
- `formatGraphqlError` strips unknown extensions; it must allow only the
  `banTicket` field of this failure. The REST login follows the same contract.

### Ownership

- Auth owns the account status. It publishes ban / restore commands and ticket
  verification.
- Moderation owns bans and appeals and reaches Auth through consumer-owned
  ports bound in `composition/`.
- Media owns appeal files: a private image upload policy for the banned subject that
  goes through the existing quarantine and scan pipeline. Reviewers download a
  file only after a clean scan, through a short-lived signed URL. The worker
  re-encodes every image to WebP; reviewers never receive the uploaded bytes.

### Data

- `account_bans`: reference (`BAN-YYYY-MM-DD-XXXXXX`), subject, issuer, rule id
  plus code and text snapshot, comment, optional content context, issued and
  lifted facts. At most one unlifted ban per subject. Rows are never deleted.
- `ban_appeals`: unique per ban, text (up to 1000 characters), status
  `PENDING` / `ACCEPTED` / `REJECTED`, decision facts; a rejection needs a
  reason.
- `ban_appeal_files`: appeal-to-media links.
- Permission `moderation.bans.manage` (admin, owner). Issue, lift and decision
  are audited and emit Outbox events.

## Packages

1. API: ban, lift, ticket at login, ban notice.
2. API: appeal, files, review.
3. Web: ban screen per mockup (needs the background artwork as a separate
   image without the interface drawn over it).
4. Web: "ban" action for administrators and the Command Deck appeals queue.

Coordinate with ChatGPT before changing App Shell behaviour for the ban route.
