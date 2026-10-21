# Content Access Module Passport 🔐

## Purpose

Content Access owns reusable hidden-content policies and viewer eligibility
evaluation for every publishing module.

## Rules

- policies combine unique global requirements with `ALL` or `ANY`;
- Premium bypass is explicit and remains visually disclosed;
- protected payloads remain in News, Community Hub, Research Lab, Knowledge
  Forge, Academy or DSS Media Platform;
- owning modules must call this service before returning gated blocks;
- missing evidence fails closed;
- Forum and publication counters remain zero until their canonical ledgers are
  delivered and connected.

Read-only and ban enforcement will be connected to the Moderation sanctions
platform in Phase 14 and must override Premium.
