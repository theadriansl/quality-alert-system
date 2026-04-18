# Backup of Unused Tables
Date: 2025-12-03T01:56:50.888Z
Reason: Tables are unused in application code

## Tables Backed Up

### 1. corrective_actions
- **Status:** EMPTY (0 records)
- **Reason for removal:** Table was created but never integrated into frontend or backend logic
- **Backend usage:** None
- **Frontend usage:** None
- **Schema backup:** corrective_actions_schema.sql

#### Table Structure:
- 25 columns including:
  - id, report_id, action_description, action_type
  - effectiveness_rating, estimated_cost, implementation_time_days
  - responsible_user_id, priority, is_selected
  - validation_plan, validation_criteria
  - implementation_status, progress_percentage
  - and more...

### 2. eightd_comments
- **Status:** Contains 8 seed data records
- **Reason for removal:** No frontend UI or backend endpoints to access this table
- **Backend usage:** None (only exists in seed data script)
- **Frontend usage:** None
- **Schema backup:** eightd_comments_schema.sql
- **Data backup:** eightd_comments_data.sql (8 records)

#### Table Structure:
- id, report_id, user_id
- comment_text, comment_type
- is_internal, created_at

#### Sample Comments (Seed Data):
1. Report 1 - "Customer complaint received. Investigating brake pad composi..." (status_update)
2. Report 1 - "Lab analysis shows contamination in brake pad material. Supp..." (general)
3. Report 2 - "Paint adhesion test results show humidity control issue duri..." (status_update)
4. Report 3 - "Software bug confirmed in ECU version 2.1.5. Patch developme..." (escalation)
5. Report 3 - "Field test of software patch successful. Preparing for produ..." (status_update)
6. Report 4 - "Seat belt buckle spring mechanism shows metallurgical defect..." (general)
7. Report 5 - "Temperature cycling test protocol updated. New housing desig..." (resolution)
8. Report 5 - "Issue closed. Improved housing design approved for productio..." (resolution)

## Restoration Instructions

If you need to restore these tables:

1. Restore schema:
   ```bash
   psql -U postgres -d apqp_system -f backups_unused_tables/corrective_actions_schema.sql
   psql -U postgres -d apqp_system -f backups_unused_tables/eightd_comments_schema.sql
   ```

2. Restore data (eightd_comments only):
   ```bash
   psql -U postgres -d apqp_system -f backups_unused_tables/eightd_comments_data.sql
   ```

## Impact Assessment

### Removing corrective_actions:
- ✅ No data loss (table is empty)
- ✅ No code changes needed (table not referenced in active code)
- ✅ Safe to remove

### Removing eightd_comments:
- ⚠️  8 seed data records will be lost (can be restored from backup)
- ✅ No functionality loss (no UI or endpoints exist)
- ✅ Safe to remove

## Verified By

- Codebase search: No SELECT/INSERT/UPDATE/DELETE queries found
- Frontend search: No references found
- Backend endpoints: No endpoints accessing these tables
- Migration files: Only CREATE TABLE statements (no active usage)

## Recommendation

✅ Both tables can be safely removed without affecting application functionality.
