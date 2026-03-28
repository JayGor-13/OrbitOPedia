/**
 * API Rate Limiter middleware.
 *
 * Prevents abuse of the satellite position and database endpoints.
 * Limits are intentionally generous for a course project; tighten for production.
 */

const rateLimit = require("express-rate-limit");

// General API limiter – applies to all /api/* routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests – please try again later." },
});

// Stricter limiter for the position endpoint (involves SGP4 computation + potential DB access)
const positionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,                  // 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Position request rate exceeded – please slow down." },
});

module.exports = { apiLimiter, positionLimiter };
