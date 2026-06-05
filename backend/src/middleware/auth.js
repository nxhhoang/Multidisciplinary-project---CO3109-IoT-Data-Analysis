/**
 * Authentication middleware
 * Verifies user tokens and populates req.user
 */

const { getPostgresPool } = require("../config/postgres");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token;
    
    if (authHeader) {
      token = authHeader.split(" ")[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "Missing authentication token", success: false });
    }

    // Decode token (basic base64 for now, can upgrade to JWT)
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    } catch (e) {
      return res.status(401).json({ message: "Invalid token", success: false });
    }

    const pool = getPostgresPool();
    const { rows } = await pool.query(
      "SELECT id, username, role FROM users WHERE id = $1",
      [decoded.userId],
    );

    if (!rows.length) {
      return res
        .status(401)
        .json({ message: "User not found", success: false });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message, success: false });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Not authenticated", success: false });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Not authorized for this action",
        success: false,
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
