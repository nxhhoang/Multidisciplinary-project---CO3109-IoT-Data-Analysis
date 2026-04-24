const { getTelemetryHistory } = require("./telemetry.service");

/**
 * Query telemetry history and serialize the result into CSV rows.
 */
async function buildTelemetryCsv(filters = {}) {
  const data = await getTelemetryHistory({
    metric: filters.metric,
    start: filters.start,
    end: filters.end,
    granularity: filters.granularity || "raw",
  });

  const rows = ["timestamp,metric,value"];
  data.forEach((entry) => {
    rows.push([entry.recorded_at, entry.metric, entry.value].join(","));
  });

  return rows.join("\n");
}

module.exports = {
  buildTelemetryCsv,
};
