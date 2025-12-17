-- Initial database setup for RemoteDevAI
-- This file is executed when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS remotedevai;

-- Set search path
ALTER DATABASE remotedevai SET search_path TO remotedevai, public;

-- Grant privileges
GRANT ALL PRIVILEGES ON SCHEMA remotedevai TO remotedevai;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA remotedevai TO remotedevai;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA remotedevai TO remotedevai;

-- Note: Prisma will handle table creation
