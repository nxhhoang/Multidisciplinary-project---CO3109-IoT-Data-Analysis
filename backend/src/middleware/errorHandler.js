/**
 * Global error handler middleware
 * Catches all errors and formats consistent error responses
 */

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  // Wrong MongoDB ID error
  if (err.name === "CastError") {
    const message = `Resource not found. Invalid: ${err.path}`;
    err = new AppError(message, 400);
  }

  // JWT error
  if (err.name === "JsonWebTokenError") {
    const message = `Invalid token. Try again`;
    err = new AppError(message, 400);
  }

  // JWT Expire error
  if (err.name === "TokenExpiredError") {
    const message = `Token has expired. Try again`;
    err = new AppError(message, 400);
  }

  // Database errors
  if (err.code === "23505") {
    const message = `Duplicate field value entered`;
    err = new AppError(message, 400);
  }

  if (err.code === "23503") {
    const message = `Foreign key constraint violation`;
    err = new AppError(message, 400);
  }

  res.status(err.statusCode).json({
    message: err.message,
    success: false,
    statusCode: err.statusCode,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  asyncHandler,
  AppError,
};
