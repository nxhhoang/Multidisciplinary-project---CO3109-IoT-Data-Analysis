const { Router } = require("express");
const { asyncHandler, authenticate } = require("../../middleware");
const {
  getLatestRecommendation,
  refreshRecommendation,
} = require("../../controllers/recommendations.controller");

const router = Router();

router.use(authenticate);

router.get("/latest", asyncHandler(getLatestRecommendation));

router.post("/refresh", asyncHandler(refreshRecommendation));

module.exports = router;
