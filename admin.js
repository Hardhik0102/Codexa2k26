// routes/admin.js
// Routes only an admin should use: approving/rejecting bookings for restricted facilities.
// Note: for hackathon simplicity we are NOT enforcing "is this user really an admin" on the
// backend with a token — the frontend just hides these buttons from non-admins. In a real
// production app you would verify the role server-side too.

const express = require("express"); // web framework
const { Op } = require("sequelize"); // comparison operators for building WHERE clauses
const router = express.Router(); // sub-app for admin routes
const { Booking, Facility, User } = require("../models"); // models from our central models/index.js

// GET /api/admin/pending-bookings
// Returns every booking still waiting on an admin decision
router.get("/pending-bookings", async (req, res) => {
  try {
    const pending = await Booking.findAll({
      where: { status: "PENDING" }, // only PENDING bookings
      include: [
        { model: Facility, as: "facility", attributes: ["name", "category", "location"] }, // readable facility info
        { model: User, as: "requester", attributes: ["name", "email"] }, // show who requested it
      ],
    });

    res.json({ success: true, bookings: pending });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/bookings/:id/approve
// Approves a pending booking — but FIRST re-checks for conflicts, in case another
// booking grabbed the same slot while this one was waiting for approval.
router.post("/bookings/:id/approve", async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id); // load the booking being approved
    if (!booking || booking.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Booking not found or not pending" });
    }

    // Re-run the same overlap check used at creation time, excluding this booking itself
    const conflict = await Booking.findOne({
      where: {
        facilityId: booking.facilityId, // same facility
        status: "APPROVED", // only compare against already-approved bookings
        id: { [Op.ne]: booking.id }, // don't compare the booking against itself
        startDateTime: { [Op.lt]: booking.endDateTime }, // overlap formula, same as in bookings.js
        endDateTime: { [Op.gt]: booking.startDateTime },
      },
    });

    if (conflict) {
      // Someone else's booking was approved in the meantime — this one can no longer be approved as-is
      return res.status(409).json({ success: false, message: "Slot no longer available — a conflicting booking exists" });
    }

    booking.status = "APPROVED"; // flip status to approved
    await booking.save(); // persist the change

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/admin/bookings/:id/reject
// Rejects a pending booking (frees the slot immediately, same as cancellation does)
router.post("/bookings/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body; // optional rejection reason

    const [affectedCount, affectedRows] = await Booking.update(
      { status: "REJECTED", cancellationReason: reason || "Rejected by admin", cancelledAt: new Date() },
      {
        where: { id: req.params.id, status: "PENDING" }, // atomic guard — only reject if still pending
        returning: true,
      }
    );

    if (affectedCount === 0) {
      return res.status(400).json({ success: false, message: "Booking not found or not pending" });
    }

    res.json({ success: true, booking: affectedRows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; // export so server.js can mount this at /api/admin
