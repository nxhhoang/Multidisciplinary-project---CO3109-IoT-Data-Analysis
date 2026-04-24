/**
 * Input validation middleware
 * Validates request bodies and query parameters
 */

const validateTelemetry = (req, res, next) => {
  const { feed_key, value, created_at } = req.body;

  if (!feed_key || value === undefined) {
    return res
      .status(400)
      .json({
        message: "Missing required fields: feed_key, value",
        success: false,
      });
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return res
      .status(400)
      .json({ message: "Value must be numeric", success: false });
  }

  next();
};

const validateConfiguration = (req, res, next) => {
  const { metric_name, ideal_min, ideal_max, critical_min, critical_max } =
    req.body;

  if (metric_name === undefined || metric_name === null) {
    return res
      .status(400)
      .json({ message: "metric_name is required", success: false });
  }

  const requiredNumbers = [ideal_min, ideal_max, critical_min, critical_max];
  const allNumeric = requiredNumbers.every(
    (val) => val !== undefined && !isNaN(Number(val)),
  );

  if (!allNumeric) {
    return res
      .status(400)
      .json({
        message: "All threshold values must be numeric",
        success: false,
      });
  }

  const { metric } = req.query || req.body;
  if (metric !== undefined && ![0, 1, 2].includes(Number(metric))) {
    return res
      .status(400)
      .json({ message: "Invalid metric type", success: false });
  }

  next();
};

const validateDateRange = (req, res, next) => {
  const { start, end, aggregate } = req.query;

  if (start && isNaN(Date.parse(start))) {
    return res
      .status(400)
      .json({ message: "Invalid start date format", success: false });
  }

  if (end && isNaN(Date.parse(end))) {
    return res
      .status(400)
      .json({ message: "Invalid end date format", success: false });
  }

  if (
    aggregate &&
    !["none", "minute", "hour", "day", "month", "year"].includes(aggregate)
  ) {
    return res.status(400).json({
      message:
        "Invalid aggregate value. Must be: none, minute, hour, day, month, year",
      success: false,
    });
  }

  next();
};

const validateActuatorToggle = (req, res, next) => {
  const { action, duration_min } = req.body;

  if (!action || !["ON", "OFF"].includes(action)) {
    return res
      .status(400)
      .json({ message: 'action must be "ON" or "OFF"', success: false });
  }

  if (duration_min !== undefined && isNaN(Number(duration_min))) {
    return res
      .status(400)
      .json({ message: "duration_min must be numeric", success: false });
  }

  next();
};

module.exports = {
  validateTelemetry,
  validateConfiguration,
  validateDateRange,
  validateActuatorToggle,
};
