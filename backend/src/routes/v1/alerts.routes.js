const { Router } = require("express");
const { asyncHandler, authenticate } = require("../../middleware");
const {
  getAlerts,
  markAlertAsRead,
} = require("../../controllers/alerts.controller");

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(getAlerts));

router.post("/read/:alertId", asyncHandler(markAlertAsRead));

module.exports = router;
