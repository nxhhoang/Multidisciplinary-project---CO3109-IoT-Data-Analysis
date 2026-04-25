const { Router } = require("express");
const { asyncHandler, authenticate, authorize } = require("../../middleware");
const { validateConfiguration } = require("../../middleware/validation");
const {
  getAllConfigurations,
  saveConfiguration,
} = require("../../controllers/configurations.controller");

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(getAllConfigurations));

router.put(
  "/",
  authorize("admin"),
  validateConfiguration,
  asyncHandler(saveConfiguration),
);

module.exports = router;
