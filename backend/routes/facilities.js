// routes/facilities.js
// Handles listing and filtering facilities (Seminar Hall, 3D Printer, etc.)

const express = require("express"); // web framework
const { Op } = require("sequelize"); // Sequelize's comparison operators (>=, <, etc.) for building WHERE clauses
const router = express.Router(); // sub-app for facility routes
const { Facility } = require("../models"); // the Facility model

// GET /api/facilities?category=...&location=...&minCapacity=...
// Returns a list of facilities, optionally filtered by query parameters
router.get("/", async (req, res) => {
  try {
    const { category, location, minCapacity } = req.query; // read optional filters from the URL query string

    const where = { status: "ACTIVE" }; // start with a base filter: only show facilities that are currently usable

    if (category) where.category = category; // if a category filter was given, narrow the search to it
    if (location) where.location = location; // if a location filter was given, narrow the search to it
    if (minCapacity) where.capacity = { [Op.gte]: Number(minCapacity) }; // Op.gte = "greater than or equal to" — only facilities big enough

    const facilities = await Facility.findAll({ where }); // run the query against PostgreSQL with whatever filters were built above

    res.json({ success: true, facilities }); // send the results back as JSON
  } catch (error) {
    res.status(500).json({ success: false, message: error.message }); // catch-all error handler
  }
});

// GET /api/facilities/:id
// Returns a single facility by its id — used on the calendar page
router.get("/:id", async (req, res) => {
  try {
    const facility = await Facility.findByPk(req.params.id); // findByPk = "find by primary key", Sequelize's version of findById
    if (!facility) {
      return res.status(404).json({ success: false, message: "Facility not found" }); // 404 = not found
    }
    res.json({ success: true, facility }); // send it back
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; // export so server.js can mount this at /api/facilities
