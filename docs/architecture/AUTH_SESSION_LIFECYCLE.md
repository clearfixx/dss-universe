# Authentication session lifecycle

The DSS web application keeps access and refresh credentials in secure,
HttpOnly, same-site cookies. The browser never exposes either token to client
components.

## Request lifecycle

1. A fresh access token allows the request to continue.
2. An expired or malformed access token with a refresh token triggers one
   refresh attempt in the Next.js proxy.
3. Successful refresh rotates both tokens and forwards the new credentials to
   the current server render as well as the browser response.
4. Rejected refresh credentials are deleted. Protected routes redirect to the
   login page with a local `returnTo` destination.
5. A temporary authentication-service outage preserves the refresh credential
   instead of destroying the session.

The proxy is an early UX gate, not an authorization boundary. Every protected
GraphQL resolver and every mutating server action must still enforce its own
authentication and authorization.

## Route policy

Private workspaces currently include Command Deck, Media, Members, Newsroom and
Settings. Public news, recovery and password-reset routes remain accessible
without a session. Signed-in users may still use recovery links because a
successful password reset intentionally revokes their previous sessions.

## Cookie policy

- Access token: 15 minutes.
- Refresh token: browser session by default, or seven days when persistence is
  requested.
- Persistent-session marker: HttpOnly metadata used only to retain the selected
  refresh-cookie lifetime after token rotation.

Logout asks the API to revoke the current device session, clears all local
session cookies even when the API is unavailable, and returns the user to the
login page.
