CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  owner_user_id INT NOT NULL REFERENCES users(id),
  device_code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  device_type VARCHAR(30) NOT NULL,
  location VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'online',
  actuator_type VARCHAR(50) NULL,
  operating_mode VARCHAR(20) NULL,
  manual_override_until TIMESTAMP NULL,
  last_seen TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configurations (
  id SERIAL PRIMARY KEY,
  created_by INT NOT NULL REFERENCES users(id),
  updated_by INT NOT NULL REFERENCES users(id),
  device_id INT NULL REFERENCES devices(id),
  metric_name SMALLINT NOT NULL,
  ideal_min NUMERIC NOT NULL,
  ideal_max NUMERIC NOT NULL,
  critical_min NUMERIC NOT NULL,
  critical_max NUMERIC NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_configurations_device_metric
  ON configurations (COALESCE(device_id, 0), metric_name);

CREATE TABLE IF NOT EXISTS actuator_logs (
  id SERIAL PRIMARY KEY,
  actuator_device_id INT NOT NULL REFERENCES devices(id),
  user_id INT NOT NULL REFERENCES users(id),
  trigger_source VARCHAR(50) NOT NULL,
  resulting_status VARCHAR(20) NOT NULL,
  action_time TIMESTAMP NOT NULL DEFAULT NOW(),
  note TEXT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  created_by INT NOT NULL REFERENCES users(id),
  resolved_by INT NULL REFERENCES users(id),
  device_id INT NOT NULL REFERENCES devices(id),
  actuator_device_id INT NULL REFERENCES devices(id),
  metric_name SMALLINT NULL,
  value NUMERIC NULL,
  severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('warning', 'critical')),
  message TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id BIGSERIAL,
  device_id INT NOT NULL REFERENCES devices(id),
  metric_name SMALLINT NOT NULL,
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, recorded_at)
);

ALTER TABLE telemetry_events
  DROP COLUMN IF EXISTS source;

SELECT create_hypertable('telemetry_events', 'recorded_at', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_metric_time
  ON telemetry_events (metric_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_device_metric_time
  ON telemetry_events (device_id, metric_name, recorded_at DESC);

CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  created_by INT NOT NULL REFERENCES users(id),
  metric_name SMALLINT NULL,
  description TEXT NOT NULL,
  recommendation_text TEXT NOT NULL,
  optimal_range_min NUMERIC,
  optimal_range_max NUMERIC,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'medium', 'normal', 'high', 'critical')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_active
  ON recommendations (is_active, metric_name);