const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { errorHandler, requestLogger } = require("./middleware");
const healthRoutes = require("./routes/health.routes");
const apiV1Routes = require("./routes/v1");

dotenv.config();

const app = express();

const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(requestLogger);
}

app.get("/", (_req, res) => {
  res.json({
    message: "Smart agriculture backend is running",
  });
});

app.use("/health", healthRoutes);
app.use("/api/v1", apiV1Routes);

// 404 handler, not match any endpoint
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
    success: false,
  });
});

// Handle global error handler
app.use(errorHandler);

module.exports = app;
