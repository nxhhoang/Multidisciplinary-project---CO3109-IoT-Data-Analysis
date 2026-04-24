-- ==========================================================
-- SMART AGRICULTURAL IoT PLATFORM SEED DATA
-- Optimized for development and demonstration
-- ==========================================================

-- 1. Initial Users
INSERT INTO users (username, password_hash, role)
VALUES
  ('admin', 'admin', 'admin'),
  ('viewer', 'viewer', 'viewer')
ON CONFLICT (username) DO NOTHING;

-- 2. Core Devices
INSERT INTO devices (
  owner_user_id,
  device_code,
  name,
  device_type,
  location,
  status,
  actuator_type,
  operating_mode,
  manual_override_until,
  last_seen,
  updated_at
)
VALUES
  ((SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'edge-01', 'Greenhouse Sensor Node 01', 'sensor_node', 'Zone A', 'online', NULL, NULL, NULL, NOW(), NOW()),
  ((SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'act-fan-01', 'Ventilation Fan 01', 'actuator_node', 'Zone A', 'online', 'fan', 'AUTO', NULL, NOW(), NOW()),
  ((SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'act-pump-01', 'Irrigation Pump 01', 'actuator_node', 'Zone A', 'online', 'pump', 'AUTO', NULL, NOW(), NOW()),
  ((SELECT id FROM users WHERE username = 'admin' LIMIT 1), 'act-led-01', 'Alert LED 01', 'actuator_node', 'Zone A', 'online', 'led', 'AUTO', NULL, NOW(), NOW())
ON CONFLICT (device_code) DO NOTHING;

-- 3. Default Configurations (Metric Thresholds)
-- Metric 0: Temperature, 1: Humidity, 2: Light
INSERT INTO configurations (
  created_by,
  updated_by,
  device_id,
  metric_name,
  ideal_min,
  ideal_max,
  critical_min,
  critical_max,
  updated_at
)
VALUES
  ((SELECT id FROM users WHERE username = 'admin' LIMIT 1), (SELECT id FROM users WHERE username = 'admin' LIMIT 1), NULL, 0, 20, 30, 10, 36, NOW()),
  ((SELECT id FROM users WHERE username = 'admin' LIMIT 1), (SELECT id FROM users WHERE username = 'admin' LIMIT 1), NULL, 1, 40, 70, 20, 85, NOW()),
  ((SELECT id FROM users WHERE username = 'admin' LIMIT 1), (SELECT id FROM users WHERE username = 'admin' LIMIT 1), NULL, 2, 100, 800, 50, 1000, NOW())
ON CONFLICT DO NOTHING;

-- 4. Static Recommendations
INSERT INTO recommendations (created_by, metric_name, description, recommendation_text, optimal_range_min, optimal_range_max, priority, is_active)
VALUES
  ((SELECT id FROM users WHERE username = 'admin' LIMIT 1), 0, 'Temperature control', 'Maintain temperature between 20°C and 30°C. If temperature exceeds 36°C, activate cooling fans immediately.', 20, 30, 'high', true),
  ((SELECT id FROM users WHERE username = 'admin' LIMIT 1), 1, 'Humidity optimization', 'Maintain humidity between 40% and 70%. If humidity drops below 20%, activate irrigation.', 40, 70, 'high', true),
  ((SELECT id FROM users WHERE username = 'admin' LIMIT 1), 2, 'Light management', 'Maintain light intensity between 100 and 800 Lux during growing hours.', 100, 800, 'medium', true)
ON CONFLICT DO NOTHING;

INSERT INTO telemetry_events (device_id, metric_name, value, recorded_at)
SELECT d.id, s.metric_name, s.value, s.recorded_at
FROM (
  VALUES
    -- March 16 (Seed data)
    ('edge-01', 0, 25.7::numeric, '2026-03-16 04:00:00'::timestamp),
    ('edge-01', 0, 26.2::numeric, '2026-03-16 05:00:00'::timestamp),
    ('edge-01', 0, 28.5::numeric, '2026-03-16 06:00:00'::timestamp),
    ('edge-01', 0, 32.1::numeric, '2026-03-16 07:00:00'::timestamp),
    ('edge-01', 0, 34.5::numeric, '2026-03-16 08:00:00'::timestamp),
    ('edge-01', 0, 31.2::numeric, '2026-03-16 09:00:00'::timestamp),
    ('edge-01', 1, 43.0::numeric, '2026-03-16 04:00:00'::timestamp),
    ('edge-01', 1, 45.5::numeric, '2026-03-16 05:00:00'::timestamp),
    ('edge-01', 1, 42.1::numeric, '2026-03-16 06:00:00'::timestamp),
    ('edge-01', 1, 38.4::numeric, '2026-03-16 07:00:00'::timestamp),
    ('edge-01', 1, 35.0::numeric, '2026-03-16 08:00:00'::timestamp),
    ('edge-01', 2, 93.0::numeric, '2026-03-16 04:00:00'::timestamp),
    ('edge-01', 2, 450.0::numeric, '2026-03-16 06:00:00'::timestamp),
    ('edge-01', 2, 850.0::numeric, '2026-03-16 08:00:00'::timestamp),
    ('edge-01', 2, 120.0::numeric, '2026-03-16 10:00:00'::timestamp),
    
    -- Recent Data (April 20-24)
    ('edge-01', 0, 22.1::numeric, '2026-04-20 10:00:00'::timestamp),
    ('edge-01', 0, 24.5::numeric, '2026-04-21 10:00:00'::timestamp),
    ('edge-01', 0, 27.8::numeric, '2026-04-22 10:00:00'::timestamp),
    ('edge-01', 0, 37.2::numeric, '2026-04-23 10:00:00'::timestamp), -- Critical High
    ('edge-01', 0, 25.4::numeric, '2026-04-24 08:00:00'::timestamp),
    
    ('edge-01', 1, 55.0::numeric, '2026-04-20 10:00:00'::timestamp),
    ('edge-01', 1, 52.3::numeric, '2026-04-21 10:00:00'::timestamp),
    ('edge-01', 1, 48.9::numeric, '2026-04-22 10:00:00'::timestamp),
    ('edge-01', 1, 15.4::numeric, '2026-04-23 10:00:00'::timestamp), -- Critical Low
    ('edge-01', 1, 42.0::numeric, '2026-04-24 08:00:00'::timestamp),
    
    ('edge-01', 2, 300.0::numeric, '2026-04-20 10:00:00'::timestamp),
    ('edge-01', 2, 650.0::numeric, '2026-04-21 10:00:00'::timestamp),
    ('edge-01', 2, 950.0::numeric, '2026-04-22 10:00:00'::timestamp), -- Warning High
    ('edge-01', 2, 400.0::numeric, '2026-04-23 10:00:00'::timestamp),
    ('edge-01', 2, 1100.0::numeric, '2026-04-24 08:00:00'::timestamp) -- Critical High
) AS s(device_code, metric_name, value, recorded_at)
JOIN devices d ON d.device_code = s.device_code;

-- 6. Sample Alerts
INSERT INTO alerts (created_by, device_id, metric_name, value, severity_level, message, is_resolved, created_at)
VALUES
  (1, (SELECT id FROM devices WHERE device_code = 'edge-01'), 0, 37.2, 'critical', 'Temperature is in critical range', false, '2026-04-23 10:00:00'),
  (1, (SELECT id FROM devices WHERE device_code = 'edge-01'), 1, 15.4, 'critical', 'Humidity is in critical range', false, '2026-04-23 10:00:00'),
  (1, (SELECT id FROM devices WHERE device_code = 'edge-01'), 2, 950.0, 'warning', 'Light is outside the ideal range', true, '2026-04-22 10:00:00');

-- 7. Sample Actuator Logs
INSERT INTO actuator_logs (actuator_device_id, user_id, trigger_source, resulting_status, action_time, note)
VALUES
  ((SELECT id FROM devices WHERE device_code = 'act-fan-01'), 1, 'auto', 'ON', '2026-04-23 10:05:00', 'Triggered by high temperature threshold'),
  ((SELECT id FROM devices WHERE device_code = 'act-pump-01'), 1, 'manual', 'ON', '2026-04-24 09:00:00', 'Manual override for 15 minutes'),
  ((SELECT id FROM devices WHERE device_code = 'act-led-01'), 1, 'auto', 'ON', '2026-04-23 10:00:00', 'Anomaly indicator active');
