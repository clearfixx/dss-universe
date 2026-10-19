# D4.4 — Content GraphQL presentation composition

Date: 2026-10-19. Status: owner-approved design; bounded local implementation in
progress, full acceptance pending.

Owner subsequently approved implementation through isolated root composition.
The bounded local implementation/evidence is tracked separately in
[the composition packet](D4_4_CONTENT_PRESENTATION_COMPOSITION.md); this design
alone is not acceptance or proof of a green full gate.

The owner explicitly requires isolation instead of a direct Content Access enum
import in Editor presentation. This follows
[ADR-004](../architecture/adr/004-module-integration-contracts.md).

## Observed boundary

Content Access currently registers Prisma-backed `ContentGateOperator` and
`ContentGateRequirementKind` in `content-gates.graphql.ts`. That file combines
inputs, output models and its resolver. Editor's `editor.model.ts` references the
same Prisma requirement enum for delivery decisions. The shared enum identity is
a transport concern; it does not justify a sibling feature dependency.

The existing root `composition/content/content-integration.module.ts` wires the
decision adapters. Feature modules keep their own services private. Editor's
existing viewer-document projection deliberately omits decision details and is
not a replacement for the current GraphQL delivery response.

## Proposed ownership

- Add a dedicated root content GraphQL presentation composition module. Keep it
  separate from the existing integration adapters to avoid mixing transport and
  policy wiring.
- Define and register the two explicit wire enums once in that root presentation
  boundary. Preserve their GraphQL names and values; do not place business enums
  in neutral Shared/Core and do not create a generic enum registry.
- Move the affected GraphQL operations and models to that boundary. Inputs,
  output models, enum declarations, resolvers and mapping functions have separate
  responsibilities/files. Root presentation is the only consumer of its wire
  enum; features do not import root presentation.
- Content Access publishes narrow named capabilities for existing create and
  evaluate operations. Editor publishes narrow named capabilities for preview
  and viewer-safe delivery. Use explicit tokens and immutable result contracts,
  not concrete service exports or a general feature facade.
- Root presentation translates those results and inputs explicitly. Content
  Access retains evaluation and creation rules. Editor retains normalization,
  rendering and server-side redaction, including failure propagation. No rule,
  protected document or repository is relocated into transport composition.

## Compatibility requirements

Preserve `createContentGate`, `evaluateContentGate`, `previewEditorDocument` and
`deliverEditorDocument`, their arguments, output fields, nullability and enum
values. Preserve authentication, `ContentGatesConfigure`, validation constraints,
group-key normalization and current error propagation. Register each resolver
exactly once and remove its former feature provider registration in the same
change. Do not expose additional document or viewer facts.

No schema migration, access-policy change, new permissions, UI implementation,
cache, timeout change or new transaction is part of this package.

## Verification before acceptance

1. Characterize current SDL, operation validation, guards and delivery failures.
2. Add focused capability and mapping tests, including unknown enum rejection.
3. Assert no feature-to-feature or feature-to-root presentation imports, no
   presentation Prisma imports and no concrete service exports.
4. Check module boot, single enum/resolver registration and byte-level generated
   schema compatibility; inspect generated changes rather than accepting drift.
5. Run guest/authenticated gate and editor delivery HTTP regressions, including
   denied content and provider failure, then the full project quality gate.

Only remove the two matching architecture baseline findings after migration and
verification. Current approval selects the composition direction, not a waiver
for existing red checks or acceptance of an unimplemented boundary.
