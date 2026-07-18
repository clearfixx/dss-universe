# DSS Universe 1.0 — Canonical Product and Module Map

> Status: Canonical for 1.0
>
> Updated: 2026-07-18

This document fixes the approved product names, boundaries and primary routes. Generic names may appear in code as domain terms, but user-facing navigation and product documentation use the branded names below.

## Naming Rules

| Generic concept               | Canonical DSS name | Responsibility                                               |
| ----------------------------- | ------------------ | ------------------------------------------------------------ |
| Forum                         | Community Hub      | Topics, replies, voting, curators and community discussions  |
| Articles / analytical content | Research Lab       | Long-form research, guides and analytical publications       |
| Wiki                          | Knowledge Forge    | Collaborative, versioned manuals and knowledge articles      |
| Admin Panel                   | Mission Control    | General administration and platform operations               |
| Personal dashboard            | Command Deck       | Personal progress, tasks, recommendations and activity       |
| Learning                      | Academy            | Courses, lessons, enrollment and progress                    |
| Media                         | DSS Media Platform | Upload, processing, metadata, access and file lifecycle      |
| AI                            | AI Core            | Cross-platform AI capabilities and orchestration             |
| Support                       | Support Center     | Tickets, feature requests, bugs and release information      |
| Maintenance                   | Maintenance Center | Health, queues, cache, storage, search and maintenance modes |

The deprecated product name `Control Center` must not be used. `Mission Control` is the administrative platform. `Command Deck` is the authenticated user's personal dashboard.

## Primary Experience Surfaces

| Surface           | Audience       | Suggested route         | Owner                    |
| ----------------- | -------------- | ----------------------- | ------------------------ |
| Guest landing     | Guest          | `/`                     | Public Web / CMS Builder |
| Universe Feed     | Signed-in user | `/`                     | Feed Platform            |
| Command Deck      | Signed-in user | `/command-deck`         | Command Deck             |
| Astronaut Profile | Public/user    | `/astronauts/:username` | Users                    |
| Account Settings  | Owner          | `/settings`             | Users / IAM              |
| Members Directory | Public/user    | `/astronauts`           | Users / Gamification     |

## Content and Community Modules

| Module          | Suggested route | Owns                                                                 | Does not own                                    |
| --------------- | --------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| News            | `/news`         | News records, editorial workflow, pinning, galleries and publication | Research papers, wiki revisions or forum topics |
| Research Lab    | `/research`     | Analytical articles, guides, collections and research publishing     | News or collaborative wiki history              |
| Knowledge Forge | `/knowledge`    | Versioned documents, revisions, review and rollback                  | Newsroom/editorial news                         |
| Community Hub   | `/community`    | Categories, forums, topics, replies, polls and curators              | News or private messages                        |
| Academy         | `/academy`      | Courses, lessons, enrollment, progress and assessments               | AI mentoring beyond the 1.0 boundary            |
| Downloads       | `/downloads`    | Public download catalog, releases, versions and download policy      | Raw platform media administration               |
| Communications  | `/messages`     | One-to-one private messages, text, code and attachments              | Group rooms in 1.0                              |
| Support Center  | `/support`      | Tickets, suggestions, bug reports, statuses and releases             | Community discussions                           |

## Shared Platform Capabilities

| Capability                           | Owner                 | Main consumers                                                                      |
| ------------------------------------ | --------------------- | ----------------------------------------------------------------------------------- |
| Identity and sessions                | Authentication / IAM  | Every authenticated module                                                          |
| Roles, permissions and custom groups | Authorization / IAM   | Every protected module                                                              |
| DSS Media Platform                   | Media                 | Users, News, Research, Knowledge Forge, Community Hub, Academy, Downloads, Messages |
| DSS Editor                           | Editor Platform       | News, Research, Knowledge Forge, Community Hub and comments                         |
| Content Gates                        | Content Gate Platform | News, Research, Knowledge Forge, Community Hub, Downloads                           |
| Comments and reactions               | Interaction Platform  | News, Research, profiles and other approved content                                 |
| Reputation                           | Gamification          | Profiles, Community Hub, ranking and moderation                                     |
| Community Points and levels          | Gamification          | Members Directory, Command Deck and profiles                                        |
| Search                               | Search Platform       | All searchable domains                                                              |
| Notifications                        | Notification Platform | All event-producing domains                                                         |
| Audit                                | Audit Platform        | Mission Control, Security Deck and compliance                                       |
| Events, outbox and jobs              | Platform Runtime      | Search, notifications, media, email, analytics and AI                               |
| AI Core                              | AI Platform           | Feed, editors, search, Academy and administrative assistance                        |
| Theme Engine                         | Theme Platform        | Entire Web application and CMS Builder                                              |

## Administrative Surfaces

These are coordinated surfaces, not independent sources of business truth.

| Surface            | Suggested route                | Responsibility                                                               |
| ------------------ | ------------------------------ | ---------------------------------------------------------------------------- |
| Mission Control    | `/mission-control`             | General administration, users, modules, queues and configuration             |
| Security Deck      | `/mission-control/security`    | Sessions, sanctions, appeals, identity intelligence and abuse detection      |
| CMS Builder        | `/mission-control/cms`         | Landing pages, navigation, content blocks, branding and SEO content          |
| Media Library      | `/mission-control/media`       | Media inspection, moderation, references and lifecycle operations            |
| Maintenance Center | `/mission-control/maintenance` | Health, cache, queues, storage, search, jobs and maintenance/read-only modes |
| Analytics Builder  | `/mission-control/analytics`   | Approved metrics, widgets, reports and exports                               |

Mission Control delegates domain actions to the owning module. It must not write directly to another module's tables.

## Access Model

- `USER` accesses normal user capabilities.
- Custom groups grant only allowlisted user/content permissions.
- `MODERATOR` accesses moderation capabilities in Security Deck.
- `ADMIN` accesses Mission Control and may issue permanent sanctions according to policy.
- Platform-owner or similarly elevated access may be introduced only as an explicit security decision; product naming must not depend on a hidden `SUPER_ADMIN` role.

## Terminology Compatibility

Internal code may retain stable technical nouns when useful:

- `forum` can remain a domain/package name while the UI says Community Hub;
- `wiki` can remain a technical content type while the UI says Knowledge Forge;
- `media` is the domain noun while the complete platform name is DSS Media Platform;
- `admin` may appear in permission names and routes, but the product surface is Mission Control.

New user-facing copy, routes documentation and mockups must use canonical names.
