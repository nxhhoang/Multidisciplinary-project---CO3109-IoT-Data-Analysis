const authController = require("./auth.controller");
const telemetryController = require("./telemetry.controller");
const alertsController = require("./alerts.controller");
const actuatorsController = require("./actuators.controller");
const configurationsController = require("./configurations.controller");
const recommendationsController = require("./recommendations.controller");
const exportController = require("./export.controller");
const v1Controller = require("./v1.controller");
const healthController = require("./health.controller");

module.exports = {
  ...authController,
  ...telemetryController,
  ...alertsController,
  ...actuatorsController,
  ...configurationsController,
  ...recommendationsController,
  ...exportController,
  ...v1Controller,
  ...healthController,
};
