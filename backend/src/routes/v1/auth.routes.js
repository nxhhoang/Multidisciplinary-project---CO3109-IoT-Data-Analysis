const { Router } = require("express");
const { asyncHandler } = require("../../middleware");
const { loginUser, registerUser } = require("../../controllers/auth.controller");

const router = Router();

router.post("/login", asyncHandler(loginUser));
router.post("/register", asyncHandler(registerUser));

module.exports = router;
