# Two-Factor Authentication

This package completes the Auth UX Completion bridge after Phase 10. It does
not reopen or renumber an earlier roadmap phase.

## v1 contract

- TOTP authenticator apps are supported with six-digit, 30-second SHA-1 codes
  and a one-step clock-skew window.
- 2FA is optional for ordinary accounts. A mandatory policy for privileged
  roles is deliberately deferred until DSS has a staffed recovery procedure;
  forcing it earlier could permanently lock out the owner account.
- Setup returns an `otpauth://` URI and Base32 secret to the authenticated user.
  The minimal UI displays both directly. QR presentation belongs to the final
  UI pass and does not change the security contract.
- Confirmation must prove possession with a current TOTP. Ten recovery codes
  are returned once and never displayed again.
- Login and account reactivation require either a valid TOTP or one unused
  recovery code when 2FA is enabled.
- Disabling 2FA requires the current password plus a second factor, revokes all
  sessions and increments the account auth version.

## Storage and concurrency

Authenticator secrets are encrypted with AES-256-GCM using a key derived from
`AUTH_2FA_ENCRYPTION_KEY`. Production must supply an independent secret of at
least 32 characters. Recovery codes are stored only as keyed HMAC-SHA-256
digests.

Setup confirmation locks the user's 2FA row before verifying and enabling it,
so parallel confirmations cannot publish two different valid recovery-code
sets. Recovery-code consumption uses the same row lock and removes exactly one
matching digest in the transaction. A second request cannot reuse it.

An active configuration cannot be overwritten by beginning setup again. The
user must complete the authenticated disable flow first. Password recovery does
not disable 2FA: control of an email inbox alone must not bypass the second
factor.

## Operational notes

Apply migration `20261001100000_user_two_factor` before deploying the API. Keep
the encryption key in secret management and back it up: losing or changing it
invalidates every stored TOTP secret. Never log setup secrets, recovery codes or
the complete `otpauth://` URI.

The audit ledger records enable, disable and recovery-code-use events without
recording codes or secrets. Security-email delivery for 2FA events can be added
later without changing the stored model or public API.
