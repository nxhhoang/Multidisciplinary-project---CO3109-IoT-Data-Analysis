const { pingPostgres } = require("../config/postgres");

/**
 * Liveness probe: confirms the API process is reachable.
 */
function live(_req, res) {
  return res.json({
    status: "alive",
  });
}

/**
 * Readiness probe: verifies required dependencies are available.
 */
async function ready(_req, res) {
  const postgresReady = await pingPostgres().catch(() => false);

  return res.status(200).json({
    status: "ready",
    postgres: postgresReady,
    dependencies: {
      postgres: postgresReady,
      timescaledb: postgresReady,
    },
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  live,
  ready,
};
