-- MatchCare Database Setup
DROP DATABASE IF EXISTS matchcare_fresh_db;
DROP USER IF EXISTS matchcare_user;

CREATE USER matchcare_user WITH PASSWORD 'matchcare123';
CREATE DATABASE matchcare_fresh_db OWNER matchcare_user;
GRANT ALL PRIVILEGES ON DATABASE matchcare_fresh_db TO matchcare_user;
\c matchcare_fresh_db;
GRANT ALL ON SCHEMA public TO matchcare_user;
