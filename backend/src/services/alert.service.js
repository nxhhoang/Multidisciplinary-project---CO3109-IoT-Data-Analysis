const { getPostgresPool } = require("../config/postgres");

const METRIC_LABELS = {
  0: "Temperature",
  1: "Humidity",
  2: "Light",
};

/**
 * Normalize metric filter input into internal numeric metric codes.
 */
function normalizeMetric(metric) {
  if (metric === undefined || metric === null || metric === "") {
    return null;
  }

  const value = String(metric).trim().toLowerCase();
  if (["0", "temperature", "temp", "temp-test1"].includes(value)) return 0;
  if (["1", "humidity", "humid", "humid-test1"].includes(value)) return 1;
  if (
    ["2", "light", "light_intensity", "luminor", "luminor-test1"].includes(
      value,
    )
  )
    return 2;
  return null;
}

/**
 * Query alerts with optional status/severity/metric filters and map to API shape.
 */
async function listAlerts(filters = {}) {
  const pool = getPostgresPool();
  const where = [];
  const params = [];

  if (filters.status) {
    const normalizedStatus = String(filters.status).toLowerCase();
    params.push(normalizedStatus === "resolved");
    where.push(`is_resolved = $${params.length}`);
  }

  if (filters.severity) {
    params.push(filters.severity);
    where.push(`severity_level = $${params.length}`);
  }

  const normalizedMetric = normalizeMetric(filters.metric);
  if (normalizedMetric !== null) {
    params.push(normalizedMetric);
    where.push(`metric_name = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `
      SELECT id, created_by, resolved_by, device_id, actuator_device_id, metric_name, severity_level, message, value, is_resolved, created_at, resolved_at
      FROM alerts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 200
    `,
    params,
  );

  return rows.map((alert) => ({
    id: alert.id,
    metric_name:
      alert.metric_name === null
        ? "System"
        : METRIC_LABELS[alert.metric_name] || alert.metric_name,
    metric: alert.metric_name === null ? null : Number(alert.metric_name),
    severity: alert.severity_level,
    value: alert.value === null ? null : Number(alert.value),
    message: alert.message,
    status: alert.is_resolved ? "resolved" : "open",
    created_at: new Date(alert.created_at).toISOString(),
    is_resolved: alert.is_resolved,
    resolved_at: alert.resolved_at
      ? new Date(alert.resolved_at).toISOString()
      : null,
  }));
}

/**
 * Mark an alert as resolved and return the updated alert record.
 */
async function resolveAlert(alertId, resolvedBy) {
  const pool = getPostgresPool();
  const resolver = Number(resolvedBy || 1);
  const { rows } = await pool.query(
    `
      UPDATE alerts
      SET is_resolved = TRUE, resolved_by = $2, resolved_at = NOW()
      WHERE id = $1
      RETURNING id, created_by, resolved_by, device_id, actuator_device_id, metric_name, severity_level, message, value, is_resolved, created_at, resolved_at
    `,
    [Number(alertId), resolver],
  );

  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    metric_name:
      row.metric_name === null
        ? "System"
        : METRIC_LABELS[row.metric_name] || row.metric_name,
    metric: row.metric_name === null ? null : Number(row.metric_name),
    severity: row.severity_level,
    value: row.value === null ? null : Number(row.value),
    message: row.message,
    status: row.is_resolved ? "resolved" : "open",
    created_at: new Date(row.created_at).toISOString(),
    is_resolved: row.is_resolved,
    resolved_at: row.resolved_at
      ? new Date(row.resolved_at).toISOString()
      : null,
  };
}

/**
 * Return latest telemetry value per metric plus count of open alerts.
 */
async function getAlertSummary() {
  const pool = getPostgresPool();
  const [latestResult, countResult] = await Promise.all([
    pool.query(
      `
        SELECT DISTINCT ON (metric_name)
          metric_name,
          value,
          recorded_at
        FROM telemetry_events
        ORDER BY metric_name, recorded_at DESC
      `,
    ),
    pool.query(
      `
        SELECT COUNT(*)::int AS count
        FROM alerts
        WHERE is_resolved = FALSE
      `,
    ),
  ]);

  const latestValues = latestResult.rows.reduce((acc, row) => {
    const metricName = Number(row.metric_name);
    acc[metricName] = {
      metric_name: metricName,
      metric: metricName,
      label: METRIC_LABELS[metricName] || metricName,
      value: Number(row.value),
      timestamp: new Date(row.recorded_at).toISOString(),
    };
    return acc;
  }, {});

  return {
    latestValues,
    alertCount: countResult.rows[0]?.count || 0,
  };
}

module.exports = {
  listAlerts,
  resolveAlert,
  getAlertSummary,
};
