/**
 * Application constants
 * Centralized definitions for metrics, severities, and other constants
 */

const METRICS = {
  TEMPERATURE: 0,
  HUMIDITY: 1,
  LIGHT: 2,
};

const METRIC_LABELS = {
  0: "Temperature",
  1: "Humidity",
  2: "Light",
};

const METRIC_UNITS = {
  0: "°C",
  1: "%",
  2: "Lux",
};

const METRIC_NAMES = {
  0: "temperature",
  1: "humidity",
  2: "light",
};

const SEVERITY_LEVELS = {
  WARNING: "warning",
  CRITICAL: "critical",
};

const ALERT_STATUS = {
  OPEN: "open",
  RESOLVED: "resolved",
};

const DEVICE_TYPES = {
  SENSOR_NODE: "sensor_node",
  ACTUATOR_NODE: "actuator_node",
  HYBRID: "hybrid",
};

const DEVICE_STATUS = {
  ONLINE: "online",
  OFFLINE: "offline",
};

const ACTUATOR_TYPES = {
  PUMP: "pump",
  FAN: "fan",
  LED: "led",
};

const OPERATION_MODES = {
  AUTO: "AUTO",
  MANUAL: "MANUAL",
};

const TRIGGER_SOURCES = {
  AUTO: "auto",
  MANUAL: "manual",
  SYSTEM: "system",
};

const ROLES = {
  ADMIN: "admin",
  VIEWER: "viewer",
};

const HTTP_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

const ADAFRUIT_FEED_MAPPING = {
  "temp-test1": METRICS.TEMPERATURE,
  "humid-test1": METRICS.HUMIDITY,
  "light-test1": METRICS.LIGHT,
  "luminor-test1": METRICS.LIGHT,
};

const DEFAULT_QUERY_RANGE_DAYS = 3;

const TIME_INTERVALS = {
  MINUTE: "minute",
  HOUR: "hour",
  DAY: "day",
  MONTH: "month",
  YEAR: "year",
};

module.exports = {
  METRICS,
  METRIC_LABELS,
  METRIC_UNITS,
  METRIC_NAMES,
  SEVERITY_LEVELS,
  ALERT_STATUS,
  DEVICE_TYPES,
  DEVICE_STATUS,
  ACTUATOR_TYPES,
  OPERATION_MODES,
  TRIGGER_SOURCES,
  ROLES,
  HTTP_CODES,
  ADAFRUIT_FEED_MAPPING,
  DEFAULT_QUERY_RANGE_DAYS,
  TIME_INTERVALS,
};
