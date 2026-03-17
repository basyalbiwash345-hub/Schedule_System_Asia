-- Note: Create the database 'asia1' via the WebStorm GUI first, then run this.

-- 0. DROP existing tables (reverse order)
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS holidays;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS rotation_assignments;
DROP TABLE IF EXISTS rotations;
DROP TABLE IF EXISTS rotation_types;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS users;

-- 1. CUSTOM TYPES (Replacing MySQL inline ENUMs)
CREATE TYPE status_type AS ENUM ('active', 'inactive');
CREATE TYPE interval_type AS ENUM ('day', 'week', 'biweek', 'month');
CREATE TYPE slot_type AS ENUM ('full', 'morning', 'afternoon');
CREATE TYPE assignment_status AS ENUM ('scheduled', 'overridden', 'cancelled');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE absence_code_type AS ENUM ('v', 'a', 'mv', 'av', 'pv');

-- 2. ORGANIZATIONAL HIERARCHY
CREATE TABLE groups (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        status status_type DEFAULT 'active',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locations (
                           id SERIAL PRIMARY KEY,
                           name VARCHAR(255) NOT NULL,
                           address TEXT,
                           timezone VARCHAR(50) DEFAULT 'MST',
                           status status_type DEFAULT 'active',
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teams (
                       id SERIAL PRIMARY KEY,
                       name VARCHAR(255) NOT NULL,
                       group_id INT REFERENCES groups(id) ON DELETE CASCADE,
                       parent_team_id INT REFERENCES teams(id) ON DELETE CASCADE,
                       status status_type DEFAULT 'active'
);

-- 3. USER MANAGEMENT
CREATE TABLE users (
                       id SERIAL PRIMARY KEY,
                       name VARCHAR(255) NOT NULL,
                       email VARCHAR(255) UNIQUE NOT NULL,
                       password_hash VARCHAR(255) NOT NULL,
                       status status_type DEFAULT 'active',
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
                       id SERIAL PRIMARY KEY,
                       name VARCHAR(100) UNIQUE NOT NULL,
                       description TEXT
);

CREATE TABLE user_roles (
                            user_id INT REFERENCES users(id) ON DELETE CASCADE,
                            role_id INT REFERENCES roles(id) ON DELETE CASCADE,
                            PRIMARY KEY (user_id, role_id)
);

-- 4. ROTATION LOGIC
CREATE TABLE rotation_types (
                                id SERIAL PRIMARY KEY,
                                name VARCHAR(255) NOT NULL,
                                default_interval_unit interval_type NOT NULL
);

CREATE TABLE rotations (
                           id SERIAL PRIMARY KEY,
                           name VARCHAR(255) NOT NULL,
                           rotation_type_id INT REFERENCES rotation_types(id) ON DELETE SET NULL,
                           team_id INT REFERENCES teams(id) ON DELETE CASCADE,
                           location_id INT REFERENCES locations(id) ON DELETE SET NULL,
                           start_date DATE NOT NULL,
                           interval_unit interval_type NOT NULL,
                           interval_count INT DEFAULT 1,
                           assigned_member_ids JSONB,
                           notes TEXT,
                           allow_double_booking BOOLEAN DEFAULT FALSE,
                           escalation_tiers JSONB,
                           status status_type DEFAULT 'active',
                           CONSTRAINT check_team_or_location CHECK (
                               (team_id IS NOT NULL AND location_id IS NULL) OR
                               (team_id IS NULL AND location_id IS NOT NULL)
                               )
);

-- 5. THE SCHEDULE & STATUS
CREATE TABLE rotation_assignments (
                                      id SERIAL PRIMARY KEY,
                                      rotation_id INT REFERENCES rotations(id) ON DELETE CASCADE,
                                      user_id INT REFERENCES users(id) ON DELETE CASCADE,
                                      start_time TIMESTAMP NOT NULL,
                                      end_time TIMESTAMP NOT NULL,
                                      status_code VARCHAR(10),
                                      slot slot_type DEFAULT 'full',
                                      status assignment_status DEFAULT 'scheduled'
);

CREATE TABLE leave_requests (
                                id SERIAL PRIMARY KEY,
                                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                                start_date DATE NOT NULL,
                                end_date DATE NOT NULL,
                                absence_code absence_code_type NOT NULL,
                                status leave_status DEFAULT 'pending',
                                approved_by INT REFERENCES users(id) ON DELETE SET NULL
);

-- 6. SYSTEM DATA & AUDIT
CREATE TABLE holidays (
                          id SERIAL PRIMARY KEY,
                          name VARCHAR(255) NOT NULL,
                          holiday_date DATE NOT NULL,
                          group_id INT REFERENCES groups(id) ON DELETE CASCADE
);

CREATE TABLE audit_logs (
                            id SERIAL PRIMARY KEY,
                            user_id INT REFERENCES users(id) ON DELETE SET NULL,
                            action VARCHAR(255) NOT NULL,
                            entity_type VARCHAR(100) NOT NULL,
                            entity_id INT,
                            old_value JSONB, -- JSONB is faster/better than JSON in Postgres
                            new_value JSONB,
                            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
