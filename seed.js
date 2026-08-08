// seed.js
// Run this with "node seed.js" (or "npm run seed") to wipe the database and fill it
// with the exact dummy dataset described in the problem statement — 3 facilities,
// 3 users, and 4 bookings/requests in specific states, so you can demo immediately.

require("dotenv").config(); // load DATABASE_URL from .env
const { sequelize, User, Facility, Booking, AdjustmentRequest } = require("./models"); // everything we need, wired with associations

// Small helper to build a Date for "the next Wednesday" at a given hour, so the
// seeded booking always looks like a realistic upcoming slot no matter when you run this.
function nextWednesdayAt(hour) {
  const now = new Date(); // current date/time
  const result = new Date(now); // copy it so we don't mutate "now"
  const daysUntilWednesday = (3 - result.getDay() + 7) % 7 || 7; // 3 = Wednesday (Sunday=0...Saturday=6); "|| 7" pushes to NEXT week if today IS Wednesday
  result.setDate(result.getDate() + daysUntilWednesday); // move the date forward to that Wednesday
  result.setHours(hour, 0, 0, 0); // set the exact hour, and zero out minutes/seconds/ms
  return result; // return the finished Date object
}

async function seed() {
  await sequelize.authenticate(); // confirm we can reach the database
  console.log("Connected to database");

  // force: true DROPS and RECREATES every table to match our models — perfect for a clean
  // demo reset, but never use force:true against a database with real data you care about.
  await sequelize.sync({ force: true });
  console.log("Tables recreated");

  // Create the 3 users. Passwords are plain text HERE only because the User model's
  // beforeCreate hook automatically hashes them before writing to PostgreSQL.
  const admin = await User.create({ name: "Admin User", email: "admin@campus.edu", password: "admin123", role: "admin" });
  const studentA = await User.create({ name: "Student A", email: "studenta@campus.edu", password: "student123", role: "student" });
  const studentB = await User.create({ name: "Student B", email: "studentb@campus.edu", password: "student123", role: "student" });
  console.log("Users created");

  // Create the 3 facilities exactly as specified
  const seminarHall = await Facility.create({
    name: "Main Seminar Hall", category: "Seminar Hall", capacity: 200, location: "Main Block",
    restricted: true, autoApprove: false, status: "ACTIVE", // restricted = true means bookings need admin approval
  });
  const maker3DPrinter = await Facility.create({
    name: "Maker Space 3D Printer", category: "3D Printer", capacity: 5, location: "Innovation Lab",
    restricted: false, autoApprove: true, status: "ACTIVE",
  });
  const conferenceRoom = await Facility.create({
    name: "Conference Room", category: "Conference Room", capacity: 30, location: "Administration Block",
    restricted: false, autoApprove: true, status: "ACTIVE",
  });
  console.log("Facilities created");

  // 1. One CANCELLED historical booking — demonstrates that cancellation preserves history
  await Booking.create({
    facilityId: conferenceRoom.id,
    requesterId: studentA.id,
    startDateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    endDateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
    purpose: "Club meeting", eventName: "Robotics Club Sync",
    status: "CANCELLED", cancellationReason: "Event postponed", cancelledAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
  });

  // 2. One upcoming APPROVED booking owned by Student B — this is the slot Student A will request in the demo
  const approvedBooking = await Booking.create({
    facilityId: seminarHall.id,
    requesterId: studentB.id,
    startDateTime: nextWednesdayAt(14), // 2 PM next Wednesday
    endDateTime: nextWednesdayAt(16), // 4 PM next Wednesday
    purpose: "Department event", eventName: "Guest Lecture Series",
    attendeeCount: 120,
    status: "APPROVED",
  });

  // 3. One PENDING booking — waiting for admin approval, shows up on the admin dashboard
  await Booking.create({
    facilityId: seminarHall.id,
    requesterId: studentA.id,
    startDateTime: nextWednesdayAt(10),
    endDateTime: nextWednesdayAt(12),
    purpose: "Workshop", eventName: "AI Workshop",
    attendeeCount: 80,
    status: "PENDING",
  });
  console.log("Bookings created");

  // 4. One PENDING adjustment request — Student A asking Student B to relinquish the Wed 2-4 PM slot
  await AdjustmentRequest.create({
    requesterId: studentA.id,
    targetBookingId: approvedBooking.id, // points at the approved booking created above
    requestType: "RELINQUISH",
    message: "Could you kindly relinquish this slot for an urgent department event?",
    status: "PENDING",
  });
  console.log("Adjustment request created");

  console.log("\nSeed complete! Login credentials:");
  console.log("  Admin:     admin@campus.edu / admin123");
  console.log("  Student A: studentA@campus.edu / student123");
  console.log("  Student B: studentB@campus.edu / student123");

  await sequelize.close(); // close the database connection cleanly
  process.exit(0); // exit the script successfully
}

seed().catch((err) => {
  // catch any error during seeding, print it, and exit with a failure code
  console.error("Seeding failed:", err);
  process.exit(1);
});
