# Command Deck and platform owner — product decisions

Date: 2026-10-13. Authority: explicit owner clarification in the working conversation.
Status: requirements accepted; implement in the relevant roadmap phases, not now.

## Execution fence

Continue the approved pre-Phase-11 debt sequence. These requirements do not
authorize new Command Deck, owner-role or operational-tool implementation in D3.
The previous six-permission DEBT-047 proposal does not define the platform owner
and is superseded as a product-policy proposal. Existing approved DEBT-046
assignment safety is retained; no security guard is removed by this decision.
Track the remaining availability concern explicitly, without claiming resolution.

## Platform owner and administrators

- Exactly one platform owner; ownership is not transferable through the product.
- Platform commands cannot ban, deactivate or remove ownership from that subject.
- Only owner appoints, restricts or removes administrators.
- Only owner accesses database tools, CMS Builder and module enable/disable controls.
- Administrators manage content and users; they cannot grant owner-only privileges.
- An owner administrative session can lock/expire; this is not account blocking.

## Content removal and audit

Staff removal hides content from everyone except platform owner, including other
administrators and the removing moderator. Owner sees it in normal page context
with a "Content deleted" marker. Only owner may initiate permanent content purge.
Record actor, timestamp, reason, module/target coordinates, previous/new state,
audit event ID, session ID and request/correlation ID. IP and User-Agent are
investigative signals, not proof of account theft; define trusted-proxy handling,
restricted access and retention. Never log tokens, passwords or secrets.
Audit is not editable through Command Deck.

Enforce visibility in APIs, search, feeds, caches and attachment delivery, not
only UI. Automated token/cache/temp-file lifecycle is not prohibited by the
owner-only content purge rule. Backup retention and restored deleted content
require an explicit lifecycle policy before purge implementation.

## Operational tools

- File manager browses managed DSS files only, never server code, secrets or OS paths.
- Database console is read-only with restricted credentials and safe data surfaces,
  query timeout and result limits; read-only must not expose authentication secrets.
- Backup tools create/list/download backups for owner, with reauthentication and audit.
- Restore is not included in the currently agreed UI scope; no arbitrary write SQL.
- Health Center shows service status, database/server load, latency, errors and queues.
- Administrative home shows resource analytics with selectable periods and comparisons.
  Candidate catalog: registrations/activation/activity, content production/publication,
  views/comments/ratings/bookmarks, moderation/reports/appeals, learning/downloads,
  gamification, and a small operational summary. Metric definitions and retention
  need phase design; no speculative analytics collection now.

## Administrative access session

An authenticated administrator/owner must confirm the current password before
entering Command Deck. Administrative elevation is separate from, and bound to,
the site session. Manual lock removes elevation without logging out of the site.
Default idle timeout is 15 minutes, configurable by owner. Automatic background
polling must not keep elevation alive. Lock applies across tabs of that session;
unlock requires password again. Site logout/session revocation or loss of staff
authority invalidates elevation. Every administrative API enforces the boundary
server-side; browser timers and hidden controls are not authorization.

## Phase allocation

| Requirement                                                  | Design/implementation home                                                                                             |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Owner identity, reserved privileges, staff appointment       | IAM/access policy planning and security integration; reconcile during D3.5 design, no implicit implementation approval |
| Owner-only hidden content, purge and attribution             | Phase 14 moderation and owning content/Media lifecycle integration                                                     |
| Administrative password confirmation and locking             | Command Deck operations/security phase (historically Phase 22), coordinated with Auth-owned verification               |
| Analytics home, Health Center, backup and read-only DB tools | Command Deck/Analytics/Operations (historically Phase 22)                                                              |
| CMS Builder and owner-only controls                          | Phase 20 CMS; module availability coordinated with operations                                                          |
| Managed-file browser                                         | Existing Media boundary plus Command Deck operations; not a second filesystem owner                                    |

Roadmap headings still contain historical Mission Control/Command Deck naming.
Canonical meaning remains Mission Control = personal dashboard; Command Deck =
administration. Do not implement against the reversed historical labels.
