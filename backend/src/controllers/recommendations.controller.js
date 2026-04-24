const {
  latestRecommendation,
  regenerateRecommendation,
} = require("../services/recommendation.service");

/**
 * Return the latest stored recommendation for the dashboard.
 */
async function getLatestRecommendation(_req, res) {
  return res.json({ data: await latestRecommendation() });
}

/**
 * Recompute and persist a fresh recommendation from current alert context.
 */
async function refreshRecommendation(_req, res) {
  return res.json({ data: await regenerateRecommendation() });
}

module.exports = {
  getLatestRecommendation,
  refreshRecommendation,
};
