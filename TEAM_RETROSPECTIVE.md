# M5 Team Retrospective

## Summary of Team Performance
The team performed exceptionally well during the final phases of the CALTRC build. We successfully implemented the required features for our MVP and effectively collaborated using a strict pull request workflow. Despite some initial challenges with database integration and testing setups in earlier milestones, the team banded together to ensure a robust, "green" CI pipeline by M5. 

## What Went Well
- **Communication & Workflow**: The branch naming conventions and PR rules strictly enforced code quality. No code was merged without appropriate review.
- **Adapting to Feedback (Peer Review Integration)**: Integrating peer review feedback directly into our development cycle allowed us to dramatically improve our product. We specifically addressed three high-priority issues raised during peer review:
  1. **PostgreSQL Test Suite Failures**: We fixed the broken test suite resulting from our PostgreSQL migration by creating proper mock data stores for testing environments. ([PR #12 - Fix CI Pipeline & DB tests](https://github.com/grwisbad/BigBackScanner/pull/12))
  2. **Security Vulnerability**: Addressed a critical peer review flag regarding plain-text passwords by implementing Node's native `crypto.scryptSync` for hashing and salting. ([PR #14 - Implement password hashing](https://github.com/grwisbad/BigBackScanner/pull/14))
  3. **Goals Dashboard State**: A peer review caught that navigating to past or future dates caused a "Failed to load goals" error. We fixed the backend date logic and, as a bonus, upgraded the dashboard UI with glassmorphism and animations. ([PR #15 - Fix goals date logic & enhance UI](https://github.com/grwisbad/BigBackScanner/pull/15))
- **Core Feature Implementation**: The USDA FoodData Central API integration worked flawlessly, giving our app real, dynamic nutritional data rather than relying on a static stubbed database.

## What Would Be Changed in Future Cycles
- **Testing Before Migration**: In the future, we will ensure that infrastructure changes (like transitioning from an in-memory `DataStore` to PostgreSQL) are heavily mocked in our test suite prior to merging to `main`, preventing our CI pipeline from breaking.
- **Earlier UI Integration**: We spent a lot of time perfecting the Health Survey and Goal Engine logic in the backend but struggled to wire it up to the frontend UI in time for M5. Next time, we will build "vertical slices" of features rather than purely horizontal backend modules.
- **Database Environments**: Setting up distinct environments (dev, test, prod) for the database would have spared us the workaround of falling back to the in-memory store during automated tests.
