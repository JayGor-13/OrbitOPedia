/**
 * Satellite API Routes
 *
 * Base path: /api/satellites  (mounted in src/app.js)
 *
 * Note: the /search and /position/:id routes are declared BEFORE /:id so that
 * Express matches them before treating "search" as an id value.
 */

const express = require("express");
const router = express.Router();
const {
  getAllSatellites,
  searchSatellites,
  getSatelliteById,
  getSatellitePosition,
} = require("../controllers/satelliteController");
const { positionLimiter } = require("../middleware/rateLimiter");

// GET /api/satellites
router.get("/", getAllSatellites);

// GET /api/satellites/search?q=<name>
router.get("/search", searchSatellites);

// GET /api/satellites/position/:id  (NORAD catalog number) – rate-limited
router.get("/position/:id", positionLimiter, getSatellitePosition);

// GET /api/satellites/:id  (NORAD catalog number)
router.get("/:id", getSatelliteById);

module.exports = router;
