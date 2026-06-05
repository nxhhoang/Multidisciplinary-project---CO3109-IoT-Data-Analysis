/**
 * Helper utility functions
 * Common utilities for date handling, formatting, and data transformation
 */

const {
  METRICS,
  METRIC_LABELS,
  METRIC_UNITS,
  METRIC_NAMES,
  DEFAULT_QUERY_RANGE_DAYS,
  ADAFRUIT_FEED_MAPPING,
} = require("./constants");

/**
 * Normalize metric from various input formats (name, code, feed_key)
 */
function normalizeMetric(input) {
  if (input === undefined || input === null || input === "") {
    return null;
  }

  const value = String(input).trim().toLowerCase();

  // Check if it's already a numeric code
  if (["0", "temperature", "temp", "temp-test1"].includes(value)) {
    return METRICS.TEMPERATURE;
  }
  if (["1", "humidity", "humid", "humid-test1"].includes(value)) {
    return METRICS.HUMIDITY;
  }
  if (
    ["2", "light", "light_intensity", "luminor", "luminor-test1"].includes(
      value,
    )
  ) {
    return METRICS.LIGHT;
  }

  return null;
}

/**
 * Get date range for queries
 * If no range provided, defaults to last N days
 */
function getDateRange(start, end) {
  let queryEnd = end ? new Date(end) : new Date();
  let queryStart;

  if (start) {
    queryStart = new Date(start);
  } else {
    queryStart = new Date(queryEnd);
    queryStart.setDate(queryStart.getDate() - DEFAULT_QUERY_RANGE_DAYS);
  }

  return {
    start: queryStart.toISOString(),
    end: queryEnd.toISOString(),
  };
}

/**
 * Calculate timestamp for aggregation query
 */
function getAggregationInterval(aggregate) {
  const intervals = {
    minute: "1 minute",
    hour: "1 hour",
    day: "1 day",
    month: "1 month",
    year: "1 year",
  };

  return intervals[aggregate] || null;
}

/**
 * Build aggregation query string for PostgreSQL
 */
function buildTimeSeriesAggregation(aggregate) {
  if (!aggregate || aggregate === "none") {
    return null;
  }

  const interval = getAggregationInterval(aggregate);
  if (!interval) {
    return null;
  }

  return `
    SELECT
      time_bucket('${interval}', recorded_at) AS time,
      device_id,
      metric_name,
      AVG(value) AS value
    GROUP BY time, device_id, metric_name
    ORDER BY time DESC
  `;
}

/**
 * Format telemetry data for API response
 */
function formatTelemetryResponse(rows, metric) {
  if (!rows || !rows.length) {
    return {
      metric: metric,
      label: METRIC_LABELS[metric] || "Unknown",
      unit: METRIC_UNITS[metric] || "",
      data: [],
    };
  }

  return {
    metric,
    label: METRIC_LABELS[metric],
    unit: METRIC_UNITS[metric],
    data: rows.map((row) => ({
      timestamp: new Date(row.recorded_at).toISOString(),
      value: Number(row.value),
      device_id: row.device_id,
    })),
  };
}

/**
 * Format alert data for API response
 */
function formatAlertResponse(alerts) {
  return alerts.map((alert) => ({
    id: alert.id,
    metric: alert.metric_name,
    metric_label:
      alert.metric_name !== null ? METRIC_LABELS[alert.metric_name] : "System",
    metric_unit:
      alert.metric_name !== null ? METRIC_UNITS[alert.metric_name] : "",
    value: alert.value,
    level: alert.severity_level,
    message: alert.message,
    status: alert.is_resolved ? "resolved" : "open",
    device_id: alert.device_id,
    created_at: new Date(alert.created_at).toISOString(),
    resolved_at: alert.resolved_at
      ? new Date(alert.resolved_at).toISOString()
      : null,
  }));
}

/**
 * Hash password for storage
 * (Use bcrypt in production)
 */
function hashPassword(password) {
  // This is a placeholder. Use bcrypt in production!
  return Buffer.from(password).toString("base64");
}

/**
 * Verify password
 * (Use bcrypt in production)
 */
function verifyPassword(password, hash) {
  return Buffer.from(password).toString("base64") === hash;
}

/**
 * Generate auth token
 * (Use JWT in production)
 */
function generateAuthToken(userId, username, role) {
  const payload = {
    userId,
    username,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Check if value exceeds critical range
 */
function isCritical(value, config) {
  if (!config) return false;

  const val = Number(value);
  return val < config.critical_min || val > config.critical_max;
}

/**
 * Check if value exceeds warning range
 */
function isWarning(value, config) {
  if (!config) return false;

  const val = Number(value);
  return (
    (val >= config.critical_min && val < config.ideal_min) ||
    (val > config.ideal_max && val <= config.critical_max)
  );
}

/**
 * Generate CSV line for export
 */
function formatCsvLine(timestamp, metric, value, unit, severity) {
  const escapedMetric = `"${METRIC_LABELS[metric] || metric}"`;
  return `${timestamp},${escapedMetric},${value},${unit},${severity}`;
}

module.exports = {
  normalizeMetric,
  getDateRange,
  getAggregationInterval,
  buildTimeSeriesAggregation,
  formatTelemetryResponse,
  formatAlertResponse,
  hashPassword,
  verifyPassword,
  generateAuthToken,
  isCritical,
  isWarning,
  formatCsvLine,
};
