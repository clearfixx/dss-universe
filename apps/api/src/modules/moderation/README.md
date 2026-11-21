# Moderation module

Moderation owns user sanctions. Phase 13 package M-0 delivers the sanctions
core that Community Hub needs before launch:

- a private, append-only sanctions journal;
- verbal warnings that expire after the configured lifetime;
- temporary read-only;
- automatic escalation (N active warnings → read-only for D days);
- administrator-configurable policy values;
- centralized read-only enforcement through the core
  `WRITE_RESTRICTION_READER` contract and a global interceptor.

Owner modules issue scoped sanctions through `SANCTION_ISSUER` after checking
their own scope (for example a Forum curator's topic). Enforcement points read
only `SANCTION_STATE_READER`.

Bans, permanent read-only, appeals and Security Deck remain Phase 14 work.
Public marks on content belong to the owning product (Forum staff notes) and
the existing Interaction annotations, not to this private journal.

See [the M-0 package](../../../../../docs/development/PHASE_13_M0_SANCTIONS_CORE.md).

🛡️ Moderation should be predictable for the honest and boring for the rest.
