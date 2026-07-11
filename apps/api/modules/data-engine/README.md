# Data Engine Phase 1

This module is the new production-oriented data foundation for the gaokao recommendation system.

Phase 1 includes:

- Core relational schema for nationwide gaokao data
- Repository layer for structured data access
- Query service layer for business-oriented lookups
- Recommendation facade so planner/AI modules do not access raw tables directly

Current scope:

- Does not replace existing planner APIs yet
- Does not import all historical data yet
- Safely coexists with the existing `dbService` runtime

Next phases:

1. Build import pipeline into these tables
2. Backfill Guangdong 2025 records
3. Replace planner data reads with facade calls
