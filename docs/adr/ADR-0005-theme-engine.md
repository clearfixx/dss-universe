# ADR-0005 — Token-based Theme Engine

- Status: Accepted
- Date: 2026-07-18

## Context

DSS Universe requires dark/light themes and later controlled customization. Allowing arbitrary CSS from an administrative editor would weaken security and make component behavior unpredictable.

## Decision

Theme Engine publishes versioned, validated design-token sets mapped to CSS variables. Theme Builder edits allowlisted tokens and previews changes before publish. The application ships a stable default dark and light theme. Arbitrary CSS or JavaScript injection is forbidden.

## Consequences

- all components consume semantic tokens rather than hardcoded product colors;
- theme versions can be previewed and rolled back;
- token validation and contrast/accessibility checks are required;
- broad visual redesigns still require code, while safe branding changes do not.
