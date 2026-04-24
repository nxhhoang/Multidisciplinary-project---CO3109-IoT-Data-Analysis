/**
 * Request logging middleware
 * Logs incoming requests and responses for debugging
 */

const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log("Headers:", {
    userAgent: req.get("user-agent"),
    contentType: req.get("content-type"),
    hasAuth: !!req.get("authorization"),
  });

  if (req.method !== "GET") {
    console.log(
      "Body (first 200 chars):",
      JSON.stringify(req.body).slice(0, 200),
    );
  }

  // Intercept response end
  const originalEnd = res.end;

  res.end = function (chunk, encoding) {
    const duration = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] Response: ${res.statusCode} (${duration}ms)`,
    );
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = {
  requestLogger,
};
