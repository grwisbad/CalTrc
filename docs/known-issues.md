# Known Issues (Active Triage)

The following items are identified for post-beta hardening and future release.

## High Priority

1. **Password Recovery:** No mechanism for password reset or email verification.
2. **Food Search UI:** Error UI for timeouts is functional (shows search failed) but lacks a "Retry" button; users must re-type.
3. **Session Expiry:** While tokens are now revoked manually on logout, they do not automatically expire after inactivity.

## Medium Priority

1. **Goal Formulas:** Uses a fixed Mifflin-St Jeor formula with a set 30/40/30 macro split; needs more personalization.
2. **Health Check:** No dedicated `/api/health` endpoint for monitoring deployment status.
3. **Logging:** Structured logs exist in console but are not piped to a persistent log aggregator (e.g., Datadog/CloudWatch).
4. **Audit History:** Previous survey responses are overwritten (upserted); history is not preserved in the DB.

## Low Priority

1. **Accessibility:** Screen reader labels for the dynamic log table need refinement.
2. **API Caching:** USDA responses are not cached; every search query hits the external API.
3. **Visualization:** Dashboard lacks charts for viewing progress trends over time (monthly/weekly).
