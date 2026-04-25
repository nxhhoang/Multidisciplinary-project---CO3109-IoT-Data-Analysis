const { login, register } = require("../services/auth.service");

/**
 * Authenticate user credentials and return an access token payload.
 */
async function loginUser(req, res) {
  try {
    const result = await login(req.body || {});
    return res.json({ data: result });
  } catch (error) {
    return res.status(401).json({ error: error.message || "Unauthorized" });
  }
}

/**
 * Register a new user.
 */
async function registerUser(req, res) {
  try {
    const result = await register(req.body || {});
    return res.status(201).json({ data: result });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Bad Request" });
  }
}

module.exports = {
  loginUser,
  registerUser,
};
