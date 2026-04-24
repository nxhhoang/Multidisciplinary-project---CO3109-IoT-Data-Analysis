const { Router } = require("express");
const { authenticate } = require("../../middleware");
const authRoutes = require("./auth.routes");
const telemetryRoutes = require("./telemetry.routes");
const alertRoutes = require("./alerts.routes");
const configurationRoutes = require("./configurations.routes");
const actuatorRoutes = require("./actuators.routes");
const recommendationRoutes = require("./recommendations.routes");
const exportRoutes = require("./export.routes");
const { getApiV1Info } = require("../../controllers/v1.controller");

const router = Router();

router.get("/", authenticate, getApiV1Info);

router.use("/auth", authRoutes);
router.use("/telemetry", telemetryRoutes);
router.use("/alerts", alertRoutes);
router.use("/configurations", configurationRoutes);
router.use("/actuators", actuatorRoutes);
router.use("/recommendations", recommendationRoutes);
router.use("/export", exportRoutes);

module.exports = router;
