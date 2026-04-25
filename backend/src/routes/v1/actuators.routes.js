const { Router } = require("express");
const { asyncHandler, authenticate } = require("../../middleware");
const { validateActuatorToggle } = require("../../middleware/validation");
const {
  getActuators,
  toggleActuator,
  getActuatorLogs,
} = require("../../controllers/actuators.controller");

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(getActuators));

router.post(
  "/:id/toggle",
  validateActuatorToggle,
  asyncHandler(toggleActuator),
);

router.get("/logs", asyncHandler(getActuatorLogs));

module.exports = router;