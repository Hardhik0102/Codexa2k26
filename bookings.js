// routes/bookings.js
// This is the most important file for the "no double-booking" requirement,
// and it also implements cancellation (Acceptance Test 1).

const express = require("express"); // web framework
const { Op } = require("sequelize"); // comparison operators for building WHERE clauses
const router = express.Router(); // sub-app for booking routes
const { Booking, Facility, User } = require("../models"); // models, imported from our central models/index.js

// Helper function: checks whether a proposed time range overlaps any EXISTING
// approved/pending booking on the same facility. Overlap rule:
// existing.start < requested.end  AND  existing.end > requested.start
async function hasConflict(facilityId, start, end, excludeBookingId = null) {
  const where = {
    facilityId, // only look at bookings for this same facility
    status: { [Op.in]: ["PENDING", "APPROVED"] }, // cancelled/rejected bookings never block a slot
    startDateTime: { [Op.lt]: end }, // existing booking starts before the new one ends
    endDateTime: { [Op.gt]: start }, // existing booking ends after the new one starts
    // together, the two lines above implement the overlap formula from the spec
  };

  if (excludeBookingId) {
    where.id = { [Op.ne]: excludeBookingId }; // Op.ne = "not equal" — used when re-checking a booking against itself (e.g. on approval)
  }

  const conflict = await Booking.findOne({ where }); // look for ANY booking matching this overlap query
  return conflict; // returns the conflicting booking record, or null if none found
}

// POST /api/bookings
// Creates a new booking. Expects JSON body:
// { facilityId, requesterId, startDateTime, endDateTime, purpose, eventName, attendeeCount }
router.post("/", async (req, res) => {
  try {
    const { facilityId, requesterId, startDateTime, endDateTime, purpose, eventName, attendeeCount } = req.body; // pull fields from request

    const start = new Date(startDateTime); // convert the incoming string into a real JS Date object
    const end = new Date(endDateTime); // same for end time

    if (start >= end) {
      // Basic sanity check: start must be before end
      return res.status(400).json({ success: false, message: "Start time must be before end time" }); // 400 = bad request
    }

    const facility = await Facility.findByPk(facilityId); // look up the facility being booked
    if (!facility || facility.status !== "ACTIVE") {
      // Facility must exist and be usable
      return res.status(400).json({ success: false, message: "Facility not found or not active" });
    }

    if (attendeeCount && attendeeCount > facility.capacity) {
      // Cannot book more attendees than the room holds
      return res.status(400).json({ success: false, message: "Attendee count exceeds facility capacity" });
    }

    // THE CRITICAL CHECK — this must always run on the backend, never trust the frontend calendar alone
    const conflict = await hasConflict(facilityId, start, end); // ask our helper if this slot overlaps an existing booking
    if (conflict) {
      return res.status(409).json({ success: false, message: "The selected time slot is already booked." }); // 409 = conflict
    }

    // Decide the initial status: restricted facilities need admin approval, others go straight through
    const initialStatus = facility.restricted ? "PENDING" : "APPROVED"; // ternary: condition ? valueIfTrue : valueIfFalse

    const booking = await Booking.create({
      facilityId, // foreign key column, added automatically by our association in models/index.js
      requesterId, // foreign key column pointing at the User who made the request
      startDateTime: start,
      endDateTime: end,
      purpose,
      eventName,
      attendeeCount,
      status: initialStatus, // PENDING or APPROVED depending on the facility's restricted flag
    });

    res.status(201).json({ success: true, booking }); // 201 = resource created successfully
  } catch (error) {
    res.status(500).json({ success: false, message: error.message }); // catch-all error handler
  }
});

// GET /api/bookings?facilityId=...
// Returns bookings for the calendar view, optionally filtered by facility.
// Only shows PENDING and APPROVED bookings (cancelled ones should not appear as "occupying" a slot).
router.get("/", async (req, res) => {
  try {
    const { facilityId } = req.query; // optional filter from the URL
    const where = { status: { [Op.in]: ["PENDING", "APPROVED"] } }; // only bookings that currently occupy a slot
    if (facilityId) where.facilityId = facilityId; // narrow to one facility if requested

    // "include" is Sequelize's version of Mongoose's .populate() — it joins in the related
    // Facility and User rows so the frontend gets readable names instead of just ids.
    const bookings = await Booking.findAll({
      where,
      include: [
        { model: Facility, as: "facility", attributes: ["name", "category", "location"] }, // only bring back these facility fields
        { model: User, as: "requester", attributes: ["id", "name", "email"] }, // only bring back these user fields (never the password hash)
      ],
    });

    res.json({ success: true, bookings }); // send the list back
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings/my/:userId
// Returns every booking (any status) made by a specific user — used on "My Bookings" page
router.get("/my/:userId", async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      where: { requesterId: req.params.userId }, // find bookings where requesterId matches the given user id
      include: [{ model: Facility, as: "facility", attributes: ["name", "category", "location"] }], // attach readable facility info
      order: [["startDateTime", "DESC"]], // sort by start time, newest first
    });

    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/bookings/:id/cancel
// Implements Acceptance Test 1: cancel an approved booking, store the reason,
// and instantly free the slot for everyone else. We NEVER delete the row —
// we flip its status so it remains in history for audits.
router.post("/:id/cancel", async (req, res) => {
  try {
    const { reason } = req.body; // the cancellation reason typed by the user

    // Sequelize's update() with a status condition in the WHERE clause (not just the id)
    // makes this atomic: if two requests try to cancel the same booking at once, only the
    // first one (still APPROVED) will match, thanks to PostgreSQL's row-level locking.
    const [affectedCount, affectedRows] = await Booking.update(
      {
        status: "CANCELLED", // flip the status — this alone is what "frees" the slot, since our conflict
        // check and calendar queries only look at PENDING/APPROVED bookings
        cancellationReason: reason || "No reason provided", // store why it was cancelled
        cancelledAt: new Date(), // store exactly when it was cancelled, for audit history
      },
      {
        where: { id: req.params.id, status: "APPROVED" }, // only match if it's currently APPROVED — prevents double-cancelling
        returning: true, // tells PostgreSQL to hand back the updated row (Sequelize + pg support this)
      }
    );

    if (affectedCount === 0) {
      // Either the booking doesn't exist, or it wasn't APPROVED (already cancelled/pending/rejected)
      return res.status(400).json({ success: false, message: "Booking not found or cannot be cancelled" });
    }

    res.json({ success: true, booking: affectedRows[0] }); // send back the now-cancelled booking
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; // export so server.js can mount this at /api/bookings
