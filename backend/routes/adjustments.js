// routes/adjustments.js
// Implements Acceptance Test 2: peer-to-peer slot adjustment (swap/relinquish requests),
// with an ATOMIC ownership transfer when a request is accepted — this is the trickiest
// part of the whole app, so read the comments in the /accept route carefully.

const express = require("express"); // web framework
const router = express.Router(); // sub-app for adjustment routes
const { sequelize, AdjustmentRequest, Booking, User } = require("../models"); // sequelize itself is needed here for transactions

// POST /api/adjustments
// Creates a new adjustment request. Expects JSON body:
// { requesterId, targetBookingId, requestType, message }
router.post("/", async (req, res) => {
  try {
    const { requesterId, targetBookingId, requestType, message } = req.body; // pull fields from request body

    const targetBooking = await Booking.findByPk(targetBookingId); // make sure the booking being requested actually exists
    if (!targetBooking || targetBooking.status !== "APPROVED") {
      // Can only request adjustment on a booking that is currently approved/active
      return res.status(400).json({ success: false, message: "Target booking not found or not currently approved" });
    }

    if (String(targetBooking.requesterId) === String(requesterId)) {
      // A user cannot request their own booking from themselves
      return res.status(400).json({ success: false, message: "You already own this booking" });
    }

    const adjustmentRequest = await AdjustmentRequest.create({
      requesterId, // the person who WANTS the slot
      targetBookingId, // the booking being requested
      requestType, // "SWAP" or "RELINQUISH"
      message, // their note, e.g. "Urgent department event"
      status: "PENDING", // starts pending until the owner responds
    });

    res.status(201).json({ success: true, adjustmentRequest }); // 201 = created
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/adjustments/incoming/:userId
// Requests where the CURRENT USER owns the target booking — i.e. requests waiting on them
router.get("/incoming/:userId", async (req, res) => {
  try {
    const incoming = await AdjustmentRequest.findAll({
      where: { status: "PENDING" }, // only show ones still awaiting a decision
      include: [
        { model: User, as: "requester", attributes: ["name", "email"] }, // show who is asking
        {
          model: Booking,
          as: "targetBooking",
          where: { requesterId: req.params.userId }, // only requests targeting bookings THIS user owns
          required: true, // required:true turns this into an INNER JOIN — rows without a matching booking are excluded
        },
      ],
    });

    res.json({ success: true, requests: incoming });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/adjustments/outgoing/:userId
// Requests that THIS user sent to someone else
router.get("/outgoing/:userId", async (req, res) => {
  try {
    const outgoing = await AdjustmentRequest.findAll({
      where: { requesterId: req.params.userId }, // requests I created
      include: [{ model: Booking, as: "targetBooking" }], // show what I'm trying to get
      order: [["createdAt", "DESC"]], // newest first
    });

    res.json({ success: true, requests: outgoing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/adjustments/:id/accept
// THE MOST IMPORTANT ROUTE IN THE APP. When the booking owner accepts a
// relinquish/swap request, we must transfer ownership of the booking in a
// way that CANNOT be corrupted if two things happen at the same instant
// (e.g. someone else also tries to grab the slot, or the owner cancels it
// half a second before accepting). We do this using a PostgreSQL transaction
// WITH ROW LOCKING: either ALL the changes happen together, or NONE of them do,
// and no other request can touch these same rows while we're mid-transfer.
router.post("/:id/accept", async (req, res) => {
  const t = await sequelize.transaction(); // start a new database transaction — nothing is permanently saved until we call t.commit()

  try {
    // Step 1: load the adjustment request INSIDE the transaction, and LOCK its row.
    // "lock: t.LOCK.UPDATE" issues a PostgreSQL "SELECT ... FOR UPDATE" — this makes any
    // other transaction trying to touch this same row WAIT until ours finishes.
    const adjustmentRequest = await AdjustmentRequest.findByPk(req.params.id, {
      transaction: t, // ties this query to our transaction
      lock: t.LOCK.UPDATE, // locks the row for the duration of the transaction
    });

    if (!adjustmentRequest || adjustmentRequest.status !== "PENDING") {
      // If it's already been accepted/declined by someone else, or doesn't exist, bail out immediately
      await t.rollback(); // throw away any changes made so far in this transaction
      return res.status(400).json({ success: false, message: "Adjustment request not found or already handled" });
    }

    // Step 2: re-load the target booking INSIDE the transaction, and LOCK it too, then
    // re-verify it's still valid. This "re-check right before acting" step is exactly what
    // prevents a third party from stealing the slot during the handover — we are not
    // trusting data we looked at earlier, and the row lock means nobody else can be
    // mid-way through their own change to this same booking at the same time.
    const targetBooking = await Booking.findByPk(adjustmentRequest.targetBookingId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!targetBooking || targetBooking.status !== "APPROVED") {
      // The booking might have been cancelled by its owner in the meantime — reject the accept
      await t.rollback();
      return res.status(409).json({ success: false, message: "This booking is no longer available for transfer" }); // 409 = conflict
    }

    // Step 3: perform the actual ownership transfer.
    // For RELINQUISH: the requester simply becomes the new owner of the exact same slot.
    // For SWAP: in this simplified hackathon version we treat it the same way (transfer ownership) —
    // a full two-way swap would additionally flip the requester's own original booking here.
    targetBooking.requesterId = adjustmentRequest.requesterId; // change who owns this booking
    await targetBooking.save({ transaction: t }); // save the change AS PART of this transaction

    // Step 4: mark the adjustment request as accepted, in the SAME transaction
    adjustmentRequest.status = "ACCEPTED"; // update its status
    adjustmentRequest.respondedAt = new Date(); // record when the decision was made
    await adjustmentRequest.save({ transaction: t }); // save, also part of the same transaction

    // Step 5: everything above succeeded — make it all permanent at once, and release the row locks
    await t.commit(); // commit = "save all of the above changes for real, together, and unlock the rows"

    res.json({ success: true, message: "Slot transferred successfully", booking: targetBooking }); // let the frontend know it worked
  } catch (error) {
    // If ANYTHING above throws an error, we undo every change made in this transaction
    await t.rollback(); // rollback — as if none of steps 1-4 ever happened, and locks are released
    res.status(500).json({ success: false, message: error.message }); // report the error
  }
});

// POST /api/adjustments/:id/decline
// Simpler than accept — no ownership change needed, just flip the status
router.post("/:id/decline", async (req, res) => {
  try {
    const [affectedCount, affectedRows] = await AdjustmentRequest.update(
      { status: "DECLINED", respondedAt: new Date() }, // mark as declined with a timestamp
      {
        where: { id: req.params.id, status: "PENDING" }, // only decline if it's still pending (atomic guard, same idea as cancel)
        returning: true,
      }
    );

    if (affectedCount === 0) {
      return res.status(400).json({ success: false, message: "Request not found or already handled" });
    }

    res.json({ success: true, adjustmentRequest: affectedRows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; // export so server.js can mount this at /api/adjustments
