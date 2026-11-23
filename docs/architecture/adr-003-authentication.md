# ADR-003: Access and Refresh Session Strategy

- **Status:** Accepted; implementation pending
- **Context:** The React SPA needs authenticated account/admin actions while refresh credentials must not be readable from JavaScript.
- **Decision:** Use short-lived signed access tokens held in memory and random rotating refresh tokens in HttpOnly SameSite cookies; store only a hash of each refresh token and revoke sessions on logout/rotation. Enforce roles server-side and check origin/CSRF constraints on cookie-authenticated operations.
- **Consequences:** Page reload requires a refresh call; API calls must handle expiry once and avoid localStorage credentials. Production requires TLS and cookie settings; tests must cover rotation/replay/revocation and admin denial.
