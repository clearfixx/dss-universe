# DSS Universe Documentation

> Welcome to the DSS Universe Knowledge Base.
>
> This documentation provides a complete overview of the project's architecture, engineering standards, development workflow, release process, and long-term roadmap.

---

# Getting Started

If you are new to the project, read the documents in the following order.

1. `PROJECT_CONTEXT.md`
2. `roadmap/DSS_UNIVERSE_1.0_ROADMAP.md`
3. `architecture/SYSTEM_DESIGN.md`
4. `development/onboarding.md`
5. `development/QUALITY_GATE.md`

This reading order introduces the project's philosophy before diving into implementation details.

## Current Canonical Documents

For current product and architecture work, use these sources first:

1. `PROJECT_CONTEXT.md` — actual repository and implementation snapshot;
2. `roadmap/DSS_UNIVERSE_1.0_ROADMAP.md` — approved 1.0 scope and delivery sequence;
3. `product/MODULE_MAP.md` — canonical product names, routes and ownership;
4. `architecture/SYSTEM_DESIGN.md` — approved platform architecture;
5. `design/MOCKUP_CATALOG.md` — canonical/supporting/historical mockup classification;
6. `adr/` — accepted architecture decisions.
7. `development/QUALITY_GATE.md` — mandatory verification and test strategy.
8. `architecture/PHASE_7_USER_CONTRACTS.md` — frozen Users/Profile backend
   ownership, privacy invariants and deferred cross-phase extensions.
9. `architecture/PHASE_8_REPUTATION_LEDGER.md` — immutable direct reputation,
   reversal, cooldown and policy contracts.
10. `architecture/PHASE_8_COMMUNITY_POINTS_LEDGER.md` — event-derived
    participation ledger, configurable weights, caps and reversals.
11. `architecture/PHASE_8_LEVELS_FOUNDATION.md` — Community Points-derived
    progress, configurable thresholds and immutable transitions.
12. `architecture/PHASE_8_CUSTOM_TITLES_FOUNDATION.md` — permission-neutral
    title definitions, historical grants and cooldown-protected selection.
13. `architecture/PHASE_8_ACHIEVEMENTS_FOUNDATION.md` — semantic event rules,
    idempotent awards, cooldowns, caps and moderation-aware rollback.
14. `architecture/PHASE_8_LEADERBOARDS_FOUNDATION.md` — Community
    Points-derived month, year and all-time rankings with deterministic ties.
15. `architecture/PHASE_8_GAMIFICATION_FRONTEND.md` — typed profile and Members
    Directory composition for points, levels, reputation, titles, achievements
    and leaderboards.
16. `architecture/PHASE_9_INTERACTION_TARGET_REGISTRY.md` — canonical
    cross-module target identity, lifecycle and owner-policy authorization.
17. `architecture/PHASE_9_SHARED_COMMENTS_FOUNDATION.md` — shared comment
    bodies, bounded replies, immutable revisions and public tombstones.
18. `architecture/PHASE_9_SHARED_REACTIONS_FOUNDATION.md` — idempotent content
    reactions, rebuildable vote aggregates and strict Reputation separation.
19. `architecture/PHASE_9_SHARED_BOOKMARKS_FOUNDATION.md` — private saved-item
    ownership, retry-safe mutations and owner-domain access boundaries.
20. `architecture/PHASE_9_COMMENT_MENTIONS_FOUNDATION.md` — relational comment
    mentions and delivery-neutral Notifications integration events.
21. `architecture/PHASE_9_REPORTS_MODERATION_ANNOTATIONS.md` — shared abuse
    reports, permission-protected review and public moderation history.
22. `architecture/PHASE_9_DSS_EDITOR_FOUNDATION.md` — versioned canonical
    Tiptap JSON, profile allowlists and safe server projections.

Older roadmap and architecture files are historical references when they conflict with these documents.

---

# Documentation Structure

## Architecture

Project architecture and technical design.

Location:

```
architecture/
```

Includes:

- System Architecture
- Backend Architecture
- Frontend Architecture
- Monorepo Architecture
- Architecture Decision Records (ADR)

---

## Development

Engineering processes and workflows.

Location:

```
development/
```

Includes:

- Development Workflow
- Branch Strategy
- Development Environment
- Useful Commands

---

## Releases

Release management documentation.

Location:

```
releases/
```

Includes:

- CHANGELOG
- Version History
- Release Process

---

## Roadmap

Long-term planning and project progress.

Location:

```
roadmap/
```

Includes:

- Development Phases
- Planned Modules
- Milestones

---

## Standards

Project-wide engineering standards.

Location:

```
../standards/
```

Includes:

- Architecture
- Backend
- Frontend
- Naming
- Folder Structure
- Imports
- Comments
- Testing
- Git
- Philosophy

---

## Templates

Reusable documentation templates.

Location:

```
templates/
```

---

# Documentation Principles

The documentation is intended to answer questions that source code alone cannot answer.

In general:

- Source code explains **how** the system works.
- Documentation explains **why** the system is designed that way.

Documentation should remain concise, accurate, and easy to navigate.

---

# Keeping Documentation Updated

Documentation is maintained alongside the source code.

Any significant architectural or engineering change should be reflected in the appropriate document before being merged into the main branch.

---

# Engineering Philosophy

The documentation follows the same engineering principles as the source code:

- clarity;
- consistency;
- maintainability;
- scalability;
- long-term thinking.

---

**Build for years, not for weeks.**
