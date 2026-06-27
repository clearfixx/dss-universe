# Release Process

> This document defines how releases are prepared, verified, and published in DSS Universe.
>
> Every release should follow a consistent process to ensure quality, stability, and traceability.

---

# Purpose

A release represents a stable milestone in the project's evolution.

The release process ensures that only completed, tested, and documented work reaches the `main` branch and becomes part of an official version.

---

# Release Lifecycle

Every release follows the same lifecycle.

```text
Mission
    ↓
Implementation
    ↓
Testing
    ↓
Documentation
    ↓
Review
    ↓
Merge
    ↓
Version History
    ↓
CHANGELOG
    ↓
Release
```

---

# Before a Release

Before creating a release, verify that:

- implementation is complete;
- all tests pass;
- documentation is updated;
- ADRs are updated if necessary;
- the feature satisfies its Definition of Done.

---

# Release Checklist

Before merging into `main`:

- Code reviewed
- Documentation reviewed
- Git history is clean
- No temporary code remains
- No debug statements remain
- Environment variables are documented
- CHANGELOG updated
- VERSION_HISTORY updated

---

# Versioning

The project follows Semantic Versioning.

```text
MAJOR.MINOR.PATCH
```

Example:

```text
1.0.0
1.1.0
1.1.1
2.0.0
```

Meaning:

- MAJOR — incompatible changes
- MINOR — new functionality
- PATCH — bug fixes

---

# Release Documentation

Every release should update:

- CHANGELOG
- VERSION_HISTORY

Release documentation should summarize what changed without duplicating commit history.

---

# Merge Policy

Only stable and reviewed work may be merged into `main`.

Unfinished work should remain in its feature branch.

---

# Release Philosophy

A release is more than a Git tag.

A release is a stable snapshot of the project's evolution.

Every release should leave the project in a better state than before.

---

**Build for years, not for weeks.**
