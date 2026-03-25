# M5 Team Retrospective

## Summary of Team Performance
The team performed exceptionally well during the final phases of the CALTRC build. We successfully implemented the required features for our MVP and effectively collaborated using a strict pull request workflow. Despite some initial challenges with database integration and testing setups in earlier milestones, the team banded together to ensure a robust, "green" CI pipeline by M5. 

## What Went Well
- **Communication & Workflow**: The branch naming conventions and PR rules strictly enforced code quality. No code was merged without appropriate review.
- **Adapting to Feedback**: Integrating peer review feedback directly into our development cycle allowed us to catch major issues early (like the broken test suite from an incomplete PostgreSQL integration and the plain-text password security flaw).
- **Core Feature Implementation**: The USDA FoodData Central API integration worked flawlessly, giving our app real, dynamic nutritional data rather than relying on a static stubbed database.

## What Would Be Changed in Future Cycles
- **Testing Before Migration**: In the future, we will ensure that infrastructure changes (like transitioning from an in-memory `DataStore` to PostgreSQL) are heavily mocked in our test suite prior to merging to `main`, preventing our CI pipeline from breaking.
- **Earlier UI Integration**: We spent a lot of time perfecting the Health Survey and Goal Engine logic in the backend but struggled to wire it up to the frontend UI in time for M5. Next time, we will build "vertical slices" of features rather than purely horizontal backend modules.
- **Database Environments**: Setting up distinct environments (dev, test, prod) for the database would have spared us the workaround of falling back to the in-memory store during automated tests.
