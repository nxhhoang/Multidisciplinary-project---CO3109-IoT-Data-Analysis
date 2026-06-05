const { Router } = require("express");
const { asyncHandler } = require("../middleware");
const { live, ready } = require("../controllers/health.controller");

const router = Router();

router.get("/live", live);

router.get("/ready", asyncHandler(ready));

module.exports = router;
