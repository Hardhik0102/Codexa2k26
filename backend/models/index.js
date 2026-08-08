// models/index.js
// This file ties all our models together and defines the RELATIONSHIPS between
// tables (equivalent to foreign keys in SQL, and to what Mongoose called
// "ref" + ".populate()" in the MongoDB version of this app).
// Every route file should import models FROM HERE (not directly from
// User.js/Booking.js etc.) so the associations below are guaranteed to be set up.

const { sequelize } = require("../config/db"); // the shared database connection
const User = require("./User");
const Facility = require("./Facility");
const Booking = require("./Booking");
const AdjustmentRequest = require("./AdjustmentRequest");

// --- Booking belongs to one Facility, a Facility can have many Bookings ---
Booking.belongsTo(Facility, { as: "facility", foreignKey: "facilityId" }); // adds a "facilityId" column to bookings, and lets us do Booking.findAll({ include: "facility" })
Facility.hasMany(Booking, { foreignKey: "facilityId" }); // the reverse direction of the same relationship

// --- Booking belongs to one User (the requester), a User can have many Bookings ---
Booking.belongsTo(User, { as: "requester", foreignKey: "requesterId" }); // adds a "requesterId" column to bookings
User.hasMany(Booking, { foreignKey: "requesterId" });

// --- AdjustmentRequest belongs to one User (the requester) ---
AdjustmentRequest.belongsTo(User, { as: "requester", foreignKey: "requesterId" });
User.hasMany(AdjustmentRequest, { foreignKey: "requesterId" });

// --- AdjustmentRequest belongs to one Booking (the target being requested) ---
AdjustmentRequest.belongsTo(Booking, { as: "targetBooking", foreignKey: "targetBookingId" });
Booking.hasMany(AdjustmentRequest, { foreignKey: "targetBookingId" });

// Export everything from one place so route files can do:
// const { User, Facility, Booking, AdjustmentRequest, sequelize } = require("../models");
module.exports = { sequelize, User, Facility, Booking, AdjustmentRequest };
