const {
  listActuators,
  switchActuator,
  listActuatorLogs,
} = require("../services/actuator.service");

/**
 * Return current state of all configured actuators.
 */
async function getActuators(_req, res) {
  return res.json({ data: await listActuators() });
}

/**
 * Apply a manual actuator toggle request and return the updated actuator state.
 */
async function toggleActuator(req, res) {
  try {
    const actuator = await switchActuator(req.params.id, req.body || {});
    return res.json({ data: actuator });
  } catch (error) {
    return res
      .status(404)
      .json({ message: error.message || "Actuator not found", success: false });
  }
}

/**
 * Return recent actuator action logs for audit and troubleshooting.
 */
async function getActuatorLogs(_req, res) {
  return res.json({ data: await listActuatorLogs() });
}

module.exports = {
  getActuators,
  toggleActuator,
  getActuatorLogs,
};
