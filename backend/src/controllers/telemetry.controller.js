const {
  writeTelemetry,
  getLatestTelemetry,
  getTelemetryHistory,
} = require("../services/telemetry.service");

/**
 * Accept telemetry payload(s), persist valid records, and trigger alert/auto-action flow.
 */
async function ingestTelemetry(req, res) {
  const result = await writeTelemetry(req.body || {});
  return res.status(result.stored ? 200 : 202).json(result);
}

/**
 * Return the latest telemetry point per metric/device, optionally filtered by metric and owner.
 */
async function getLatest(req, res) {
  const metric = req.query.metric || undefined;
  const latest = await getLatestTelemetry(
    metric,
    req.query.user_id || req.query.userId,
  );

  return res.json({ data: latest });
}

/**
 * Return telemetry history in raw or aggregated form for charting and analysis.
 */
async function getHistory(req, res) {
  const { metric, user_id, start, end, aggregate, granularity } = req.query;

  const data = await getTelemetryHistory({
    metric,
    user_id,
    start,
    end,
    aggregate,
    granularity,
  });

  return res.json({ data });
}

module.exports = {
  ingestTelemetry,
  getLatest,
  getHistory,
};
