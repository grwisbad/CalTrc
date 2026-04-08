# M4 Evidence Summary

## 1) Feature-Complete MVP

- Auth flow is live (`/api/auth/signup`, `/api/auth/login`) with Supabase persistence.
- **Improved:** Auth flow now includes a secure `/api/auth/logout` endpoint that revokes session tokens in the database.
- Survey flow is live and **mandatory**; users must complete their profile before accessing goals.
- Daily goals and progress are live and computed using the Mifflin-St Jeor BMR formula.
- Food log workflow is live with real-time USDA search.

## 2) Reliability / Quality Fixes

- **Session Revocation:** Logout now deletes the valid session token from Supabase, preventing token hijacking after logout.
- **External Resilience:** USDA API calls in `foodLogger.js` now include an 8-second timeout (via AbortController) and a 3-attempt retry strategy.
- **Survey Integrity:** Added non-dismissable modal-shake prevention to ensure all users have goal data.
- **Bug Fix:** Resolved a validator issue where non-numeric strings could bypass survey checks.

## 3) Expanded Testing

- Expanded test suite from ~15 to **26 passed tests**.
- **Edge Case Coverage:** Added tests for NaN/non-numeric survey inputs, empty submissions, and USDA API network failures/retries.
- CI is green and covers all high-risk logic.

## 4) Operability Basics

- **Structured Logging:** Integrated a timestamped logger utility (`src/logger.js`) to replace plain console output.
- Config via environment variables (database URL + SSL controls).
- Documented known issues for active triage (`docs/known-issues.md`).

## 5) Release / Demo Artifacts

- Beta release tag exists (`v0.9.0-beta`).
- All code builds and passes DoD (Definition of Done) criteria.
