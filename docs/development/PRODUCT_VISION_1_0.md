# DSS Universe — Owner Product Vision 1.0

Owner/Command Deck clarification (2026-10-13): see the accepted
[owner and administrative operation decisions](COMMAND_DECK_OWNER_DECISIONS.md).
Implement those requirements in their relevant phases, not as an expansion of
the current pre-Phase-11 debt package.

> Recorded: 2026-10-11. Owner requirements take precedence over conflicting
> historical naming. This document records scope, not implementation acceptance.

## Purpose and names

DSS Universe is one configurable developer community: publish, discuss, learn,
share files, compete and grow without bridges between unrelated products.
Internal modules retain narrow responsibilities and explicit contracts.

- Guest home: product landing page.
- **Mission Control**: the authenticated user's personal dashboard.
- **Command Deck**: administration.
- Mission Log / Publishing Platform: news and publishing.
- Community Hub: forum.
- Research Lab: the owner's name for wiki-style articles.
- Downloads: shared file archive; brand name remains open.
- Academy: courses.
- DSS Intelligence: embedded platform capabilities, not a ChatGPT clone.

Historical documents and the current dashboard route use conflicting names.
Research Lab versus Knowledge Forge also needs explicit reconciliation with the
roadmap. Do not silently rename routes, merge modules or redesign the frontend.

## Confirmed 1.0 scope

The owner's described functionality belongs to 1.0, not an optional post-1.0
wishlist. Delivery remains phased and requires an implementation gap assessment.

- Publishing: short/full content, scheduled publication, categories, tags,
  structured rich editor, text/video/audio/gallery formats, preview, SEO,
  attachments, related content, hidden content, polls and configurable comments.
- Forum: categories, sections, topics and threaded community discussion.
- Wiki-style knowledge and Academy courses with their appropriate content
  lifecycles, categorization, ratings and discussion.
- Downloads: files attached to content are also discoverable in the archive,
  with author, origin, technical metadata, comments and bookmarks, subject to
  authorization and file safety.
- One editor engine with different capability configurations, not independent
  editors per module.
- Shared transparent reputation, Experience, Community Points and a dedicated
  leaderboard/user directory with concise user information.
- Moderation, warning history, expiry, configurable escalation, read-only/mute,
  account blocking and appeal review. Rejected appeals display their reason;
  accepted appeals remove the block. Deleted-content policy remains open.
- Configurable landing blocks/order/custom blocks and module enablement.
- Maintenance mode with administrator access, visible administrator banner,
  settings link and optional deadline/automatic expiry; indefinite mode also
  supported.
- Configurable registration: ordinary signup, email verification, manual
  activation, expiring invitations and administrator-authored tests with
  optional timer and retry cooldown. Compatible gates can be combined.
- Support Center: FAQ, roadmap, bug reports, voted feature proposals,
  configurable consideration threshold, administrator decision, delivery status
  and changelog.
- Mission Control: activity and personal progress. Exact composition is deferred
  by the owner and does not block Auth boundary remediation.
- DSS Intelligence: greeting/activity summary and news poster generation only
  for the initial release; detailed providers and UX remain open.

Disabling a module denies user access without deleting its data. Warnings and
sanctions remain active even when their source content cannot be opened.

## Moderation and reputation

Forum moderators are scoped to categories. One active curator per topic is
appointed by a moderator within that moderator's scope. The curator may edit the
first message, remove comments and issue verbal warnings only inside that topic;
no mute, ban or broader permissions.

Recommended, pending detailed approval: supermoderators receive explicit module
or site-wide scopes. Forum moderation does not automatically grant News/wiki
authority. Sensitive account/device information requires a separate audited
capability, not ordinary content-moderation access.

No self-rating. Both positive and negative votes require a reason. All users can
inspect reputation history, actor, time and context. Authorized moderators may
reverse unjustified votes with an attributable reason and retained history.
Selective history visibility and negative-vote restrictions remain undecided.

## Progression: requirements versus proposed mechanics

The owner's illustrative weights are: comment +1, news +5, received positive
vote +10, received negative vote -10, research article +50. These are examples,
not a validated or approved numerical formula.

Recommended for review: keep an auditable action ledger; award eligible published
contributions only, prevent duplicate awards, bound abuse and reverse invalidated
awards. Rank by net eligible lifetime contributions, independently of spendable
balance, so future purchases do not lower contribution ranking. Do not count raw
reputation again if received votes already contribute points. Experience, Points
and rank relationships, limits and exact coefficients require approval before
implementation. No claim that a fixed weight is objectively fair without data.

## Proposed minimum media and Intelligence boundaries

For review: Media 1.0 supplies secure upload, validation/scanning, metadata,
authorized serving/downloads, image variants, attachment references and lifecycle
handling needed by publishing, galleries, courses and Downloads. An independent
social media product, advanced streaming/transcoding and creator monetization
are not implied. Existing capabilities must be verified, not assumed.

For review: greetings use authorized activity data and can fall back to templates;
poster generation is a bounded asynchronous operation producing a normal Media
asset, previewed and accepted by the author. Provider adapters, budget controls,
failure handling and data policy need a separate design decision. No generic chat
or autonomous content publication is authorized by this scope.

## After 1.0

Expanded Media Platform and Community Points purchases: nickname colors, custom
groups/titles/badges/frames and time-limited Premium. Voice chat is a distant plan.
Browser focus/tab-switch anti-cheat is explicitly deferred beyond 1.0.
