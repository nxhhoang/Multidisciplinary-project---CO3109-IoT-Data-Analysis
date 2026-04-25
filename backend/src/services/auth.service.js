const { getPostgresPool } = require("../config/postgres");

/**
 * Validate credentials against stored users and build a simple access token response.
 */
async function login(payload) {
  const { username, password, role } = payload || {};
  const normalizedUsername = String(username || "").trim();
  const normalizedPassword = String(password || "").trim();
  const normalizedRole = role === "admin" ? "admin" : "viewer";

  if (!normalizedUsername || !normalizedPassword) {
    throw new Error("username and password are required");
  }

  const pool = getPostgresPool();
  const { rows } = await pool.query(
    `
      SELECT id, username, role
      FROM users
      WHERE username = $1
        AND password_hash = $2
        AND role = $3
      LIMIT 1
    `,
    [normalizedUsername, normalizedPassword, normalizedRole],
  );

  if (!rows.length) {
    throw new Error("Invalid credentials");
  }

  const matchedUser = rows[0];
  // Generate a JSON-based token that the middleware expects
  const tokenPayload = {
    userId: matchedUser.id,
    username: matchedUser.username,
    role: matchedUser.role,
    iat: Date.now()
  };
  
  const accessToken = Buffer.from(JSON.stringify(tokenPayload)).toString("base64");

  return {
    accessToken,
    expiresIn: 3600,
    token: accessToken,
    user: {
      id: Number(matchedUser.id),
      username: matchedUser.username,
      role: matchedUser.role,
    },
  };
}

/**
 * Create a new user in the system.
 */
async function register(payload) {
  const { username, password, role = 'viewer' } = payload || {};
  const normalizedUsername = String(username || "").trim();
  const normalizedPassword = String(password || "").trim();
  const normalizedRole = role === 'admin' ? 'admin' : 'viewer';

  if (!normalizedUsername || !normalizedPassword) {
    throw new Error("username and password are required");
  }

  const pool = getPostgresPool();
  
  // Check if user already exists
  const existing = await pool.query("SELECT id FROM users WHERE username = $1", [normalizedUsername]);
  if (existing.rows.length > 0) {
    throw new Error("Username already taken");
  }

  const { rows } = await pool.query(
    `
      INSERT INTO users (username, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role
    `,
    [normalizedUsername, normalizedPassword, normalizedRole]
  );

  const newUser = rows[0];
  
  const tokenPayload = {
    userId: newUser.id,
    username: newUser.username,
    role: newUser.role,
    iat: Date.now()
  };
  
  const accessToken = Buffer.from(JSON.stringify(tokenPayload)).toString("base64");

  return {
    accessToken,
    expiresIn: 3600,
    token: accessToken,
    user: {
      id: Number(newUser.id),
      username: newUser.username,
      role: newUser.role,
    },
  };
}

module.exports = {
  login,
  register,
};
