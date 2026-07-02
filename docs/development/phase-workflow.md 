# DSS Phase Workflow

## Purpose

This document defines the development workflow used during DSS Universe phases.

The goal is to avoid guessing, reduce rework, and keep architecture decisions intentional.

## Core Rule

Do not write code blindly.

If the current architecture context is unclear, stop and perform an audit before continuing.

## Phase Start Snapshot

Before starting a new phase, create a snapshot of the relevant project area.

For a full backend phase:

```bash
find apps/api/src -type f | sort

For a specific module:

find apps/api/src/modules/<module-name> -type f | sort

For Core:

find apps/api/src/core -type f | sort
Execution Flow

Each phase should follow this order:

Snapshot
  ↓
Architecture Audit
  ↓
Execution Plan
  ↓
Code
  ↓
Build
  ↓
Architecture Audit
  ↓
Commit
Audit Before Code

Before writing code, confirm:

what files already exist;
what files need to be created;
what files need to be modified;
what files must not be touched;
which module owns the responsibility;
whether the change belongs to the current phase.
No Guessing Rule

If implementation would require guessing:

stop;
say that context is insufficient;
request a snapshot or file audit;
continue only after the current state is clear.
70 / 30 Rule

Default work ratio:

70% code
30% audit, refactoring, documentation

This does not mean skipping architecture.

It means audits should support forward progress, not replace it.

Scope Control

If a small change reveals a larger architecture issue:

do not silently expand the phase;
explain the issue;
decide whether to include it now or move it to a later phase.
Commit Rule

Commit only after:

build passes;
architecture boundaries are reviewed;
generated or moved files are staged correctly;
Git diff reflects the intended change.
DSS Principle

Architecture first.

Code second.

Guessing never.
