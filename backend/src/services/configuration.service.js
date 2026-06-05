const { getPostgresPool } = require("../config/postgres");

const DEFAULT_CONFIGURATION = {
  0: {
    ideal_min: 20,
    ideal_max: 30,
    critical_min: 10,
    critical_max: 36,
  },
  1: {
    ideal_min: 40,
    ideal_max: 70,
    critical_min: 20,
    critical_max: 85,
  },
  2: {
    ideal_min: 100,
    ideal_max: 800,
    critical_min: 50,
    critical_max: 1000,
  },
};

/**
 * Normalize metric identifier input into supported numeric metric codes.
 */
function normalizeMetricName(metric) {
  if (metric === undefined || metric === null || metric === "") {
    return null;
  }

  if (typeof metric === "number" && [0, 1, 2].includes(metric)) {
    return metric;
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
 * Ensure configurations table is reachable before reading or writing rules.
 */
async function ensureConfigurationTable() {
  const pool = getPostgresPool();
  await pool.query("SELECT 1 FROM configurations LIMIT 1");
  return true;
}

/**
 * Return all configuration rows mapped to numeric ids for API consistency.
 */
async function getConfigurations() {
  await ensureConfigurationTable();
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `
      SELECT id, created_by, updated_by, device_id, metric_name, ideal_min, ideal_max, critical_min, critical_max, updated_at
      FROM configurations
      ORDER BY metric_name ASC
    `,
  );

  return rows.map((row) => ({
    ...row,
    metric_name: Number(row.metric_name),
    created_by: Number(row.created_by),
    updated_by: Number(row.updated_by),
    device_id: row.device_id ? Number(row.device_id) : null,
  }));
}

/**
 * Insert or update threshold configuration after validating range constraints.
 */
async function upsertConfiguration(payload) {
  await ensureConfigurationTable();

  if (!payload) {
    throw new Error("payload is required");
  }

  const metricName = normalizeMetricName(payload.metric_name ?? payload.metric);
  if (metricName === null) {
    throw new Error("metric_name is required and must be one of 0,1,2");
  }

  const createdBy = Number(payload.created_by || payload.user_id || 1);
  const updatedBy = Number(
    payload.updated_by || payload.user_id || createdBy || 1,
  );
  const deviceId = payload.device_id ? Number(payload.device_id) : null;

  const values = [
    Number(payload.ideal_min),
    Number(payload.ideal_max),
    Number(payload.critical_min),
    Number(payload.critical_max),
  ];

  if (values.some((value) => Number.isNaN(value))) {
    throw new Error("All threshold values must be numeric");
  }

  if (values[0] > values[1]) {
    throw new Error("ideal_min must be less than or equal to ideal_max");
  }

  if (values[2] > values[3]) {
    throw new Error("critical_min must be less than or equal to critical_max");
  }

  if (values[0] < values[2] || values[1] > values[3]) {
    throw new Error("ideal range must stay inside critical range");
  }

  const pool = getPostgresPool();
  const existing = await pool.query(
    `
      SELECT id
      FROM configurations
      WHERE metric_name = $1
        AND (
          (device_id IS NULL AND $2::int IS NULL)
          OR device_id = $2
        )
      LIMIT 1
    `,
    [metricName, deviceId],
  );

  let rows;
  if (existing.rows.length) {
    const result = await pool.query(
      `
        UPDATE configurations
        SET updated_by = $1,
            ideal_min = $2,
            ideal_max = $3,
            critical_min = $4,
            critical_max = $5,
            updated_at = NOW()
        WHERE id = $6
        RETURNING id, created_by, updated_by, device_id, metric_name, ideal_min, ideal_max, critical_min, critical_max, updated_at
      `,
      [
        updatedBy,
        values[0],
        values[1],
        values[2],
        values[3],
        existing.rows[0].id,
      ],
    );
    rows = result.rows;
  } else {
    const result = await pool.query(
      `
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id, created_by, updated_by, device_id, metric_name, ideal_min, ideal_max, critical_min, critical_max, updated_at
      `,
      [
        createdBy,
        updatedBy,
        deviceId,
        metricName,
        values[0],
        values[1],
        values[2],
        values[3],
      ],
    );
    rows = result.rows;
  }

  return {
    ...rows[0],
    metric_name: Number(rows[0].metric_name),
    created_by: Number(rows[0].created_by),
    updated_by: Number(rows[0].updated_by),
    device_id: rows[0].device_id ? Number(rows[0].device_id) : null,
  };
}

module.exports = {
  ensureConfigurationTable,
  getConfigurations,
  upsertConfiguration,
  DEFAULT_CONFIGURATION,
};
