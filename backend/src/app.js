/**
 * OrbitOPedia Express Application
 *
 * Sets up middleware (CORS, body parsing, logging) and mounts all API routes.
 * This module is imported by server.js which handles the actual HTTP listen.
 */

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const satelliteRoutes = require("./routes/satelliteRoutes");
const rocketRoutes = require("./routes/rocketRoutes");
const errorHandler = require("./middleware/errorHandler");
const requestLogger = require("./middleware/requestLogger");
const { apiLimiter } = require("./middleware/rateLimiter");

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
// Allow the Vite dev-server and the Vercel deployment to call this API.
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "https://orbitopedia.vercel.app"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── HTTP Request Logging ─────────────────────────────────────────────────────
// Use morgan in "dev" mode for development and "combined" for production.
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Custom structured logger (appends to in-memory log for /api/health)
app.use(requestLogger);

// ── API Routes ───────────────────────────────────────────────────────────────
// Apply general rate limiting to all API endpoints
app.use("/api", apiLimiter);
app.use("/api/satellites", satelliteRoutes);
app.use("/api/rockets", rocketRoutes);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  const mongoose = require("mongoose");
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    ["disconnected", "connected", "connecting", "disconnecting"][dbState] ||
    "unknown";

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: dbStatus,
    version: require("../package.json").version,
  });
});

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
