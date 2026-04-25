const { buildTelemetryCsv } = require("../services/export.service");

/**
 * Build telemetry CSV from query filters and stream it as a download response.
 */
async function exportTelemetryCsv(req, res) {
  const csv = await buildTelemetryCsv({
    metric: req.query.metric,
    start: req.query.start,
    end: req.query.end,
    granularity: req.query.granularity,
  });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="iot-data-${new Date().toISOString().slice(0, 10)}.csv"`,
  );

  return res.send(csv);
}

module.exports = {
  exportTelemetryCsv,
};
