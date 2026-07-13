@echo off
set PGPASSWORD=postgres
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d apqp_system -c "\d defect_entries_v2"
