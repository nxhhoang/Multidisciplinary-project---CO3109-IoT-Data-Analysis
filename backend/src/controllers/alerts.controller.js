const {
  listAlerts,
  resolveAlert,
  getAlertSummary,
} = require("../services/alert.service");

/**
 * Return alert list with optional filters and include current alert summary stats.
 */
async function getAlerts(req, res) {
  const alerts = await listAlerts({
    status: req.query.status || undefined,
  });

  return res.json({ data: alerts, summary: await getAlertSummary() });
}

/**
 * Mark a single alert as resolved by the acting user.
 */
async function markAlertAsRead(req, res) {
  const { alertId } = req.params;
  const alert = await resolveAlert(
    alertId,
    req.body?.user_id || req.body?.userId,
  );

  if (!alert) {
    return res.status(404).json({ error: "Alert not found" });
  }

  return res.json({ data: alert });
}

module.exports = {
  getAlerts,
  markAlertAsRead,
};
