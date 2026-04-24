/**
 * Middleware exports
 */

const { errorHandler, asyncHandler, AppError } = require("./errorHandler");
const { authenticate, authorize } = require("./auth");
const {
  validateTelemetry,
  validateConfiguration,
  validateDateRange,
  validateActuatorToggle,
} = require("./validation");
const { requestLogger } = require("./logger");

module.exports = {
  errorHandler,
  asyncHandler,
  AppError,
  authenticate,
  authorize,
  validateTelemetry,
  validateConfiguration,
  validateDateRange,
  validateActuatorToggle,
  requestLogger,
};
