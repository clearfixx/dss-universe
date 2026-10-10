# Development Workflow — compatibility entry point

This earlier v1.0 workflow is superseded by
[the canonical workflow](development/workflow.md) and
[phase workflow](development/phase-workflow.md).

Use the [pre-Phase-11 plan](development/PRE_PHASE_11_EXECUTION_PLAN.md) for current
work. The old Auth milestone list and `pnpm --filter api start:dev` command are
not current execution instructions. A dev watcher is not a quality gate.

Keep iterations small: plan, bootstrap if needed, implement, verify, document,
review. Preserve the existing layered module layout rather than regenerating
a flat legacy skeleton.
