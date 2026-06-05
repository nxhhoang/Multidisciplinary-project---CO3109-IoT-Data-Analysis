const { Router } = require("express");
const { asyncHandler, authenticate } = require("../../middleware");
const { exportTelemetryCsv } = require("../../controllers/export.controller");

const router = Router();

router.use(authenticate);

router.get("/csv", asyncHandler(exportTelemetryCsv));

module.exports = router;
