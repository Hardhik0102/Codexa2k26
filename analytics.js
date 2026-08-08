// routes/analytics.js
// Provides the numbers shown on the analytics dashboard: total bookings,
// booked hours, cancellation rate, pending approvals, and peak demand hour.

const express = require("express"); // web framework
const { Op } = require("sequelize"); // comparison operators for building WHERE clauses
const router = express.Router(); // sub-app for analytics routes
const { Booking } = require("../models"); // Booking model

// GET /api/analytics/overview
router.get("/overview", async (req, res) => {
  try {
    const totalBookings = await Booking.count(); // count every booking ever made, any status
    const cancelledCount = await Booking.count({ where: { status: "CANCELLED" } }); // count only cancelled ones
    const pendingApprovals = await Booking.count({ where: { status: "PENDING" } }); // count ones waiting on admin

    // Cancellation rate as a percentage — guard against dividing by zero if there are no bookings yet
    const cancellationRate = totalBookings > 0 ? ((cancelledCount / totalBookings) * 100).toFixed(1) : "0.0"; // toFixed(1) = one decimal place

    // Fetch every APPROVED or CANCELLED booking so we can add up how many hours were actually booked
    const relevantBookings = await Booking.findAll({
      where: { status: { [Op.in]: ["APPROVED", "CANCELLED"] } }, // include cancelled since the hours were still originally booked
    });

    let totalMs = 0; // running total of booked time, in milliseconds
    const hourCounts = {}; // object to count how many bookings start in each hour of the day, e.g. { "14": 5 }

    relevantBookings.forEach((booking) => {
      // Loop over every booking we fetched above
      const durationMs = new Date(booking.endDateTime) - new Date(booking.startDateTime); // subtracting two Dates gives milliseconds between them
      totalMs += durationMs; // add this booking's duration to the running total

      const hour = new Date(booking.startDateTime).getHours(); // extract just the hour (0-23) the booking starts at
      hourCounts[hour] = (hourCounts[hour] || 0) + 1; // increment the count for that hour, starting at 0 if it's the first time we've seen it
    });

    const totalBookedHours = (totalMs / (1000 * 60 * 60)).toFixed(1); // convert milliseconds to hours (1000ms * 60s * 60min), one decimal place

    // Find which hour has the highest count — this is our "peak demand time"
    let peakHour = null; // will hold the winning hour
    let maxCount = 0; // will hold the highest count seen so far
    for (const hour in hourCounts) {
      // loop over every hour key we recorded
      if (hourCounts[hour] > maxCount) {
        // if this hour has more bookings than our current best
        maxCount = hourCounts[hour]; // update the best count
        peakHour = hour; // remember this hour as the new peak
      }
    }

    const peakTimeLabel = peakHour !== null ? `${peakHour}:00 - ${Number(peakHour) + 1}:00` : "No data yet"; // format nicely, e.g. "14:00 - 15:00"

    res.json({
      success: true,
      overview: {
        totalBookings, // total ever created
        totalBookedHours, // sum of hours across approved + cancelled bookings
        cancellationRate: `${cancellationRate}%`, // formatted as a percentage string
        pendingApprovals, // count still waiting on admin
        peakDemandTime: peakTimeLabel, // the busiest hour of the day
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; // export so server.js can mount this at /api/analytics
