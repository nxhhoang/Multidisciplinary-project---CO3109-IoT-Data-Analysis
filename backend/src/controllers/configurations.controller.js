const {
  getConfigurations,
  upsertConfiguration,
} = require("../services/configuration.service");

/**
 * Return the full configuration list used for threshold checks.
 */
async function getAllConfigurations(_req, res) {
  const data = await getConfigurations();
  return res.json({ data });
}

/**
 * Create or update threshold configuration for a metric/device scope.
 */
async function saveConfiguration(req, res) {
  const {
    metric,
    metric_name,
    user_id,
    device_id,
    ideal_min,
    ideal_max,
    critical_min,
    critical_max,
  } = req.body || {};

  const saved = await upsertConfiguration({
    metric,
    metric_name,
    user_id: user_id || req.user?.id,
    device_id,
    ideal_min: Number(ideal_min),
    ideal_max: Number(ideal_max),
    critical_min: Number(critical_min),
    critical_max: Number(critical_max),
  });

  return res.json({ data: saved });
}

module.exports = {
  getAllConfigurations,
  saveConfiguration,
};
