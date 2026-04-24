const { getPostgresPool } = require("../config/postgres");
const { publishActuatorCommand } = require("./adafruit.service");

/**
 * Map a raw device row into the actuator response shape used by APIs.
 */
function mapActuatorRow(row) {
  return {
    id: row.device_code,
    device_id: Number(row.id),
    device_code: row.device_code,
    name: row.name,
    type: row.actuator_type,
    status: row.status,
    mode: row.operating_mode,
    manual_expire_at: row.manual_override_until
      ? new Date(row.manual_override_until).toISOString()
      : null,
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

/**
 * Return all actuator-capable devices and their latest control state.
 */
async function listActuators() {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `
      SELECT
        id,
        device_code,
        name,
        actuator_type,
        status,
        operating_mode,
        manual_override_until,
        updated_at
      FROM devices
      WHERE actuator_type IS NOT NULL
      ORDER BY actuator_type ASC, device_code ASC
    `,
  );

  return rows.map(mapActuatorRow);
}

/**
* Update actuator state, enforce manual override rules, log action, and publish command.

* Ingest Telemetry (cause auto mode) & Manual Toggle (cause manual mode with optional duration)
*/
async function switchActuator(actuatorId, payload = {}) {
  const pool = getPostgresPool();
  const normalizedId = String(actuatorId || "")
    .trim()
    .toLowerCase();
  const nextStatus =
    String(payload.action || payload.status || "OFF").toUpperCase() === "ON"
      ? "ON"
      : "OFF";
  const durationMin = payload.duration_min ?? payload.durationMin ?? null;
  
  const actor = payload.actor || "manual";
  console.log(actor);
  const actorUserId = Number(payload.user_id || payload.userId || 1);

  const manualExpireAt =
    durationMin && nextStatus === "ON"
      ? new Date(Date.now() + Number(durationMin) * 60 * 1000)
      : null;
  const nextMode = durationMin ? "MANUAL" : "AUTO";

  const { rows: existingRows } = await pool.query(
    `
      SELECT id, device_code, name, actuator_type, status, operating_mode, manual_override_until, updated_at
      FROM devices
      WHERE actuator_type IS NOT NULL
        AND (LOWER(device_code) = $1 OR LOWER(actuator_type) = $1)
      LIMIT 1
    `,
    [normalizedId],
  );

  if (!existingRows.length) {
    throw new Error(`Unknown actuator: ${actuatorId}`);
  }

  const current = existingRows[0];
  const overrideUntil = current.manual_override_until
    ? new Date(current.manual_override_until).getTime()
    : null;
  const isManualOverrideActive =
    actor === "auto" &&
    String(current.operating_mode || "").toUpperCase() === "MANUAL" &&
    overrideUntil &&
    overrideUntil > Date.now();

  if (isManualOverrideActive) {
    await pool.query(
      `
        INSERT INTO actuator_logs (actuator_device_id, user_id, trigger_source, resulting_status, note)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        Number(current.id),
        actorUserId,
        actor,
        current.status,
        "auto action skipped due to active manual override",
      ],
    );

    return {
      ...mapActuatorRow(current),
      auto_skipped: true,
      publish: {
        published: false,
        skipped: true,
        reason: "manual override active",
      },
    };
  }

  const { rows } = await pool.query(
    `
      UPDATE devices
      SET status = $1,
          operating_mode = $2,
          manual_override_until = $3,
          updated_at = NOW()
      WHERE actuator_type IS NOT NULL
        AND (LOWER(device_code) = $4 OR LOWER(actuator_type) = $4)
      RETURNING id, device_code, name, actuator_type, status, operating_mode, manual_override_until, updated_at
    `,
    [nextStatus, nextMode, manualExpireAt, normalizedId],
  );

  await pool.query(
    `
      INSERT INTO actuator_logs (actuator_device_id, user_id, trigger_source, resulting_status, note)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      Number(rows[0].id),
      actorUserId,
      actor,
      nextStatus,
      durationMin
        ? `manual duration ${Number(durationMin)} minutes`
        : `mode ${nextMode}`,
    ],
  );

  const row = rows[0];
  let publish = {
    published: false,
    skipped: true,
    reason: "unknown",
  };

  try {
    publish = await publishActuatorCommand(row.actuator_type, row.status);
  } catch (error) {
    publish = {
      published: false,
      skipped: false,
      reason: error.message,
    };
  }

  return {
    ...mapActuatorRow(row),
    publish,
  };
}

/**
 * Return recent actuator command logs ordered by newest action first.
 */
async function listActuatorLogs() {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `
      SELECT al.id, al.actuator_device_id, d.device_code, d.actuator_type, al.user_id, al.trigger_source, al.resulting_status, al.action_time, al.note
      FROM actuator_logs al
      JOIN devices d ON d.id = al.actuator_device_id
      ORDER BY action_time DESC
      LIMIT 200
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    actuator_device_id: Number(row.actuator_device_id),
    actuator_code: row.device_code,
    actuator_type: row.actuator_type,
    user_id: Number(row.user_id),
    action: row.resulting_status,
    trigger_source: row.trigger_source,
    action_time: new Date(row.action_time).toISOString(),
    note: row.note,
  }));
}

module.exports = {
  listActuators,
  switchActuator,
  listActuatorLogs,
};
