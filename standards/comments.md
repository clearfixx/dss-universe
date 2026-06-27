# Code Comments Standard

Comments should make code easier to understand, not noisier.

## We comment

- business rules;
- non-obvious logic;
- architectural boundaries;
- important decisions;
- logical blocks in long files;
- public functions when useful.

## We do not comment obvious code

Bad:

```ts
// Return user
return user;

Good:

// ---------------------------------------------------------------------------
// Administrator account
// ---------------------------------------------------------------------------

Good:

/**
 * Creates base users for local development.
 */
export async function seedUsers() {
  // ...
}
Rule

Prefer comments that explain "why" over comments that repeat "what".
```
