$env:PGPASSWORD = "postgres"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d apqp_system -f "C:\Users\The Eidrian\quality-alert-system\backend\migrations\037_permission_system_complete.sql"
