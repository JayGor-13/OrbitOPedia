/**
 * Rocket API Routes
 *
 * Base path: /api/rockets  (mounted in src/app.js)
 */

const express = require("express");
const router = express.Router();
const { getAllRockets, getRocketById } = require("../controllers/rocketController");

// GET /api/rockets          – all rockets (supports ?status= and ?org= filters)
router.get("/", getAllRockets);

// GET /api/rockets/:id      – single rocket by frontend id (e.g. "001")
router.get("/:id", getRocketById);

module.exports = router;
