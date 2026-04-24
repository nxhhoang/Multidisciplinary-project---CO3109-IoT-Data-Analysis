const { Router } = require("express");
const { asyncHandler, authenticate } = require("../../middleware");
const {
  validateTelemetry,
  validateDateRange,
} = require("../../middleware/validation");
const {
  ingestTelemetry,
  getLatest,
  getHistory,
} = require("../../controllers/telemetry.controller");

const router = Router();

router.post(
  "/adafruit-webhook",
  validateTelemetry,
  asyncHandler(ingestTelemetry),
);

router.use(authenticate);

router.get("/latest", asyncHandler(getLatest));

router.get("/history", validateDateRange, asyncHandler(getHistory));

module.exports = router;
