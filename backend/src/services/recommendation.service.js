const { getPostgresPool } = require("../config/postgres");

/**
 * Build human-readable recommendation text from the most critical metric context.
 */
function buildRecommendationMessage(metric) {
  if (metric === 0 || metric === "temperature") {
    return "Temperature is critically high. Increase ventilation and water early in the morning.";
  }

  if (metric === 1 || metric === "humidity") {
    return "Humidity is critically high. Reduce irrigation and improve drainage.";
  }

  if (metric === 2 || metric === "light_intensity") {
    return "Light intensity is too high. Consider using shading nets.";
  }

  return "All metrics are stable. Keep the current irrigation and ventilation schedule.";
}

/**
 * Return newest recommendation; generate one on-demand if none exists yet.
 */
async function latestRecommendation() {
  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `
      SELECT id, metric_name, description, recommendation_text as message, created_at
      FROM recommendations
      WHERE is_active = TRUE
      ORDER BY created_at DESC
      LIMIT 1
    `,
  );

  if (!rows.length) {
    return null;
  }

  const recommendation = rows[0];

  return {
    id: recommendation.id,
    metric_name: recommendation.metric_name,
    description: recommendation.description,
    message: recommendation.message,
    created_at: new Date(recommendation.created_at).toISOString(),
  };
}

/**
 * Regenerate recommendation from latest unresolved alert and persist it.
 */
async function regenerateRecommendation() {
  const pool = getPostgresPool();
  const { rows: openAlerts } = await pool.query(
    `
      SELECT metric_name
      FROM alerts
      WHERE is_resolved = FALSE
      ORDER BY created_at DESC
      LIMIT 1
    `,
  );

  const metric = openAlerts[0]?.metric_name ?? null;
  const message = buildRecommendationMessage(metric);
  const { rows } = await pool.query(
    `
      INSERT INTO recommendations (created_by, metric_name, description, recommendation_text, priority)
      VALUES (1, $1, 'System generated recommendation', $2, 'normal')
      RETURNING id, metric_name, description, recommendation_text as message, created_at
    `,
    [metric, message],
  );

  const recommendation = rows[0];

  return {
    id: recommendation.id,
    metric_name: recommendation.metric_name,
    description: recommendation.description,
    message: recommendation.message,
    created_at: new Date(recommendation.created_at).toISOString(),
  };
}

module.exports = {
  latestRecommendation,
  regenerateRecommendation,
};
