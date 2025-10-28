-- PostgreSQL Schema for Batch Processing Assistant
-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS maintenance_events CASCADE;
DROP TABLE IF EXISTS batch_events CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop types if they exist
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS maintenance_reason;
DROP TYPE IF EXISTS notification_type;

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'planner', 'viewer');
CREATE TYPE maintenance_reason AS ENUM ('scheduled', 'breakdown', 'preventive', 'cleaning', 'upgrade');
CREATE TYPE notification_type AS ENUM ('batch_reminder', 'maintenance_reminder', 'batch_complete', 'maintenance_complete');

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Equipment table
CREATE TABLE equipment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Batch Events table
CREATE TABLE batch_events (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    batch_no VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    batch_size DECIMAL(10,2),
    start_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    end_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    inputs JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT batch_events_valid_time_range CHECK (end_timestamp > start_timestamp),
    CONSTRAINT batch_events_valid_actual_time_range CHECK (actual_end IS NULL OR actual_start IS NULL OR actual_end > actual_start)
);

-- Maintenance Events table
CREATE TABLE maintenance_events (
    id SERIAL PRIMARY KEY,
    equipment_id INTEGER NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    reason maintenance_reason NOT NULL,
    expected_duration INTERVAL,
    supervisor_name VARCHAR(255),
    spare_parts JSONB,
    changes_made TEXT,
    start_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    end_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start TIMESTAMP WITH TIME ZONE,
    actual_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT maintenance_events_valid_time_range CHECK (end_timestamp > start_timestamp),
    CONSTRAINT maintenance_events_valid_actual_time_range CHECK (actual_end IS NULL OR actual_start IS NULL OR actual_end > actual_start)
);

-- Notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    batch_event_id INTEGER REFERENCES batch_events(id) ON DELETE CASCADE,
    maintenance_event_id INTEGER REFERENCES maintenance_events(id) ON DELETE CASCADE,
    sent_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    type notification_type NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_event_reference CHECK (
        (batch_event_id IS NOT NULL AND maintenance_event_id IS NULL) OR
        (batch_event_id IS NULL AND maintenance_event_id IS NOT NULL)
    )
);

-- Indexes for performance (especially for calendar queries)

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Equipment
CREATE INDEX idx_equipment_name ON equipment(name);
CREATE INDEX idx_equipment_created_by ON equipment(created_by_user_id);

-- Batch Events (critical for calendar performance)
CREATE INDEX idx_batch_events_equipment_id ON batch_events(equipment_id);
CREATE INDEX idx_batch_events_time_range ON batch_events(start_timestamp, end_timestamp);
CREATE INDEX idx_batch_events_equipment_time ON batch_events(equipment_id, start_timestamp, end_timestamp);
CREATE INDEX idx_batch_events_batch_no ON batch_events(batch_no);
CREATE INDEX idx_batch_events_product_name ON batch_events(product_name);

-- Maintenance Events (critical for calendar performance)  
CREATE INDEX idx_maintenance_events_equipment_id ON maintenance_events(equipment_id);
CREATE INDEX idx_maintenance_events_time_range ON maintenance_events(start_timestamp, end_timestamp);
CREATE INDEX idx_maintenance_events_equipment_time ON maintenance_events(equipment_id, start_timestamp, end_timestamp);
CREATE INDEX idx_maintenance_events_reason ON maintenance_events(reason);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_batch_event_id ON notifications(batch_event_id);
CREATE INDEX idx_notifications_maintenance_event_id ON notifications(maintenance_event_id);
CREATE INDEX idx_notifications_sent_timestamp ON notifications(sent_timestamp);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Insert some default equipment
INSERT INTO equipment (name, is_custom, created_by_user_id) VALUES
    ('Reactor 1', FALSE, NULL),
    ('Reactor 2', FALSE, NULL),
    ('Filter Dryer 1', FALSE, NULL),
    ('Filter Dryer 2', FALSE, NULL),
    ('Distillation Column 1', FALSE, NULL),
    ('Distillation Column 2', FALSE, NULL),
    ('Crystallizer 1', FALSE, NULL),
    ('Centrifuge 1', FALSE, NULL),
    ('Blender 1', FALSE, NULL),
    ('Packaging Line 1', FALSE, NULL);

-- Create a default admin user (password: admin123)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (email, password_hash, role) VALUES
    ('admin@example.com', '$2b$10$rOz9vF7zF7zF7zF7zF7zF.eJ9rF7zF7zF7zF7zF7zF7zF7zF7zF7z', 'admin');