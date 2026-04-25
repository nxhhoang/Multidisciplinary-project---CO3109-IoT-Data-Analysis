const { getPostgresPool } = require("../config/postgres");
const { switchActuator } = require("./actuator.service");

const METRIC_CODE = {
  temperature: 0,
  humidity: 1,
  light_intensity: 2,
};

const CODE_TO_METRIC = {
  0: "temperature",
  1: "humidity",
  2: "light_intensity",
};

const METRIC_LABELS = {
  0: "Temperature",
  1: "Humidity",
  2: "Light",
};

const SUPPORTED_METRICS = [0, 1, 2];
const METRIC_TO_ACTUATOR = {
  0: "fan",
  1: "pump",
  2: "led",
};

/**
 * Normalize metric input from feed names/codes into internal numeric metric codes.
 */
function normalizeMetric(metric) {
  if (!metric) {
    return null;
  }

  if (typeof metric === "number" && [0, 1, 2].includes(metric)) {
    return metric;
  }

  const value = String(metric).trim().toLowerCase();

  if (["0", "temperature", "temp", "temp-test1"].includes(value)) {
    return METRIC_CODE.temperature;
  }

  if (["1", "humidity", "humid", "humid-test1"].includes(value)) {
    return METRIC_CODE.humidity;
  }

  if (
    ["2", "light", "light_intensity", "luminor", "luminor-test1"].includes(
      value,
    )
  ) {
    return METRIC_CODE.light_intensity;
  }

  return null;
}

/**
 * Convert metric code to canonical metric key used by API responses.
 */
function metricCodeToName(metricCode) {
  return CODE_TO_METRIC[Number(metricCode)] || "unknown";
}

/**
 * Convert metric code to display label for user-facing messages.
 */
function metricCodeToLabel(metricCode) {
  return METRIC_LABELS[Number(metricCode)] || metricCodeToName(metricCode);
}

/**
 * Normalize a raw telemetry payload item into a validated internal write model.
 */
function normalizePayloadItem(payload = {}) {
  const metric = normalizeMetric(
    payload.metric || payload.feed_key || payload.feedKey || payload.key,
  );

  const numericValue = Number(
    payload.value ?? payload.data ?? payload.last_value,
  );
  const timestampRaw =
    payload.created_at || payload.createdAt || payload.timestamp;

  if (metric === null || Number.isNaN(numericValue)) {
    return null;
  }

  const parsedTimestamp = timestampRaw ? new Date(timestampRaw) : new Date();
  const timestamp = Number.isNaN(parsedTimestamp.getTime())
    ? new Date()
    : parsedTimestamp;

  return {
    metricCode: metric,
    value: numericValue,
    timestamp,
    rawDeviceId: payload.device_id || payload.deviceId || null,
    deviceCode: payload.device_code || payload.deviceCode || "edge-01",
    actorUserId: payload.user_id || payload.userId || null,
  };
}

/**
 * Classify a reading as warning/critical using configured thresholds.
 */
function evaluateSeverity(value, config) {
  if (!config) {
    return null;
  }

  if (
    value <= Number(config.critical_min) ||
    value >= Number(config.critical_max)
  ) {
    return "critical";
  }

  if (value < Number(config.ideal_min) || value > Number(config.ideal_max)) {
    return "warning";
  }

  return null;
}

/**
 * Load default threshold configuration for a metric.
 */
async function getMetricConfig(metric) {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `
      SELECT metric_name, ideal_min, ideal_max, critical_min, critical_max
      FROM configurations
      WHERE device_id IS NULL
        AND metric_name = $1
      LIMIT 1
    `,
    [metric],
  );

  return rows[0] || null;
}

/**
 * Resolve the target device for telemetry persistence with safe fallbacks.
 */
async function resolveDeviceId(item) {
  const pool = getPostgresPool();

  if (item.rawDeviceId && Number.isFinite(Number(item.rawDeviceId))) {
    const { rows } = await pool.query(
      `
        SELECT id, owner_user_id, device_code
        FROM devices
        WHERE id = $1
        LIMIT 1
      `,
      [Number(item.rawDeviceId)],
    );

    if (rows.length) {
      return rows[0];
    }
  }

  const { rows } = await pool.query(
    `
      SELECT id, owner_user_id, device_code
      FROM devices
      WHERE device_code = $1
      LIMIT 1
    `,
    [item.deviceCode],
  );

  if (rows.length) {
    return rows[0];
  }

  const fallback = await pool.query(
    `
      SELECT id, owner_user_id, device_code
      FROM devices
      WHERE device_code = 'edge-01'
      LIMIT 1
    `,
  );

  if (!fallback.rows.length) {
    throw new Error("No device found to store telemetry (missing seed device)");
  }

  return fallback.rows[0];
}

/**
 * Persist telemetry and optionally create an alert when thresholds are violated.
 */
async function persistTelemetry(item) {
  const pool = getPostgresPool();
  const resolvedDevice = await resolveDeviceId(item);
  const metricCode = Number(item.metricCode);
  const config = await getMetricConfig(metricCode);
  const severity = evaluateSeverity(item.value, config);

  await pool.query(
    `
      INSERT INTO telemetry_events (device_id, metric_name, value, recorded_at)
      VALUES ($1, $2, $3, $4)
    `,
    [resolvedDevice.id, metricCode, item.value, item.timestamp],
  );

  if (!severity) {
    return {
      alert: null,
      autoDecision: {
        metricCode,
        value: item.value,
        config,
        actorUserId:
          Number(item.actorUserId) || Number(resolvedDevice.owner_user_id) || 1,
      },
    };
  }

  const createdBy =
    Number(item.actorUserId) || Number(resolvedDevice.owner_user_id) || 1;

  const message =
    severity === "critical"
      ? `${metricCodeToLabel(metricCode)} is in critical range`
      : `${metricCodeToLabel(metricCode)} is outside the ideal range`;

  const { rows } = await pool.query(
    `
      INSERT INTO alerts (
        created_by,
        resolved_by,
        device_id,
        actuator_device_id,
        metric_name,
        value,
        severity_level,
        message,
        is_resolved,
        created_at,
        resolved_at
      )
      VALUES ($1, NULL, $2, NULL, $3, $4, $5, $6, FALSE, $7, NULL)
      RETURNING id, device_id, metric_name, value, severity_level, message, is_resolved, created_at, resolved_at
    `,
    [
      createdBy,
      resolvedDevice.id,
      metricCode,
      item.value,
      severity,
      message,
      item.timestamp,
    ],
  );

  return {
    alert: rows[0],
    autoDecision: {
      metricCode,
      value: item.value,
      config,
      actorUserId: createdBy,
    },
  };
}

/**
 * Execute automatic actuator action based on a telemetry threshold decision.
 */
async function applyAutoActuation(decision) {
  if (!decision?.config) {
    return null;
  }

  const metricCode = Number(decision.metricCode);
  const actuatorType = METRIC_TO_ACTUATOR[metricCode];
  if (!actuatorType) {
    return null;
  }

  const value = Number(decision.value);
  const config = decision.config;
  let shouldTurnOn = false;

  // Specific rules per metric type
  switch (metricCode) {
    case 0: // Temperature -> Fan
      shouldTurnOn = value > Number(config.ideal_max);
      break;
    case 1: // Humidity -> Pump
      shouldTurnOn = value < Number(config.ideal_min);
      break;
    case 2: // Light Intensity -> LED
      shouldTurnOn = value < Number(config.ideal_min);
      break;
    default:
      shouldTurnOn = value > Number(config.ideal_max);
  }

  const action = shouldTurnOn ? "ON" : "OFF";

  return switchActuator(actuatorType, {
    action,
    actor: "auto",
    user_id: decision.actorUserId,
  });
}

/**
 * Ingest telemetry payloads, persist accepted rows, create alerts, and trigger auto-control.
 */
async function writeTelemetry(payload = {}) {
  const rows = Array.isArray(payload)
    ? payload.map(normalizePayloadItem).filter(Boolean)
    : [normalizePayloadItem(payload)].filter(Boolean);

  if (rows.length === 0) {
    return {
      stored: false,
      received: Array.isArray(payload) ? payload.length : 1,
      accepted: 0,
      ignored: Array.isArray(payload) ? payload.length : 1,
      reason: "No valid telemetry payload",
    };
  }

  const alerts = [];
  const autoActions = [];
  const autoActionErrors = [];
  for (const row of rows) {
    const persisted = await persistTelemetry(row);
    if (persisted.alert) {
      alerts.push(persisted.alert);
    }

    try {
      const autoAction = await applyAutoActuation(persisted.autoDecision);
      if (autoAction) {
        autoActions.push(autoAction);
      }
    } catch (error) {
      autoActionErrors.push(error.message);
    }
  }

  return {
    stored: true,
    received: Array.isArray(payload) ? payload.length : 1,
    accepted: rows.length,
    ignored: (Array.isArray(payload) ? payload.length : 1) - rows.length,
    alertsCreated: alerts.length,
    autoActionsTriggered: autoActions.length,
    autoActionErrors,
  };
}

/**
 * Fetch the latest reading per device/metric with optional metric and owner filters.
 */
async function getLatestTelemetry(metric, userId) {
  const pool = getPostgresPool();
  const normalizedMetric = normalizeMetric(metric);

  const values = [];
  const params = [];

  if (normalizedMetric !== null) {
    params.push(normalizedMetric);
    values.push(`te.metric_name = $${params.length}`);
  }

  if (userId) {
    params.push(Number(userId));
    values.push(`d.owner_user_id = $${params.length}`);
  }

  const whereClause = values.length ? `WHERE ${values.join(" AND ")}` : "";

  const { rows } = await pool.query(
    `
  SELECT 
    te.metric_name,
    te.value,
    te.device_id,
    te.recorded_at,
    d.device_code
  FROM (
    SELECT DISTINCT ON (device_id, metric_name)
      device_id,
      metric_name,
      value,
      recorded_at
    FROM telemetry_events
    ${whereClause}
    ORDER BY device_id, metric_name, recorded_at DESC
  ) te
  JOIN devices d ON d.id = te.device_id
  ORDER BY te.device_id ASC, te.metric_name ASC, te.recorded_at DESC
  `,
    params,
  );

  return rows.map((row) => ({
    metric_name: metricCodeToLabel(row.metric_name),
    metric: metricCodeToName(row.metric_name),
    value: Number(row.value),
    recorded_at: new Date(row.recorded_at).toISOString(),
    device_id: Number(row.device_id),
    device_code: row.device_code,
  }));
}

/**
 * Normalize aggregation input to supported SQL date_trunc levels.
 */
function normalizeAggregate(value) {
  const normalized = String(value || "none").toLowerCase();
  if (
    ["none", "raw", "minute", "hour", "day", "month", "year"].includes(
      normalized,
    )
  ) {
    return normalized === "raw" ? "none" : normalized;
  }

  return "none";
}

/**
 * Resolve query date range; default to the last 3 days when omitted.
 */
function normalizeRange(start, end) {
  if (start || end) {
    return {
      startAt: start
        ? new Date(start)
        : new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      endAt: end ? new Date(end) : new Date(),
    };
  }

  return {
    startAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    endAt: new Date(),
  };
}

/**
 * Get device ids that belong to a given user for access-scoped telemetry queries.
 */
async function getOwnedDeviceIds(userId) {
  if (!userId) {
    return [];
  }

  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `
      SELECT id
      FROM devices
      WHERE owner_user_id = $1
    `,
    [Number(userId)],
  );
  return rows.map((row) => Number(row.id));
}

/**
 * Return telemetry history as raw points or aggregated buckets for charts/export.
 */
async function getTelemetryHistory({
  metric,
  start,
  end,
  granularity,
  aggregate,
  user_id,
}) {
  const pool = getPostgresPool();
  const normalizedMetric = normalizeMetric(metric);
  const normalizedAggregate = normalizeAggregate(aggregate || granularity);
  // if not define start/end, default to last 3 days
  const { startAt, endAt } = normalizeRange(start, end);
  const filters = [];
  const params = [startAt, endAt];

  if (normalizedMetric !== null) {
    params.push(normalizedMetric);
    filters.push(`te.metric_name = $${params.length}`);
  }

  filters.push(`te.recorded_at >= $1`);
  filters.push(`te.recorded_at <= $2`);

  const ownedDeviceIds = await getOwnedDeviceIds(user_id);
  if (ownedDeviceIds.length) {
    params.push(ownedDeviceIds);
    filters.push(`te.device_id = ANY($${params.length})`);
  } else if (user_id) {
    return [];
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  if (normalizedAggregate === "none") {
    const { rows } = await pool.query(
      `
        SELECT te.metric_name, te.value, te.recorded_at, te.device_id
        FROM telemetry_events te
        ${whereClause}
        ORDER BY te.recorded_at ASC
      `,
      params,
    );

    return rows.map((row) => ({
      metric_name: metricCodeToLabel(row.metric_name),
      metric: metricCodeToName(row.metric_name),
      recorded_at: new Date(row.recorded_at).toISOString(),
      value: Number(row.value),
      device_id: Number(row.device_id),
    }));
  }

  const { rows } = await pool.query(
    `
      SELECT
        te.metric_name,
        te.device_id,
        date_trunc('${normalizedAggregate}', te.recorded_at) AS bucket,
        AVG(te.value) AS value
      FROM telemetry_events te
      ${whereClause}
      GROUP BY te.metric_name, te.device_id, bucket
      ORDER BY bucket ASC
    `,
    params,
  );

  return rows.map((row) => ({
    metric_name: metricCodeToLabel(row.metric_name),
    metric: metricCodeToName(row.metric_name),
    recorded_at: new Date(row.bucket).toISOString(),
    value: Number(Number(row.value).toFixed(2)),
    device_id: Number(row.device_id),
    aggregate: normalizedAggregate,
  }));
}

module.exports = {
  writeTelemetry,
  getLatestTelemetry,
  getTelemetryHistory,
  normalizeMetric,
  SUPPORTED_METRICS,
};
