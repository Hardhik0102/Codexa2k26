// models/Booking.js
// Defines the "bookings" table — a single reservation of a Facility by a User.
// Foreign keys (facilityId, requesterId) and relationships are wired up in models/index.js.

const { DataTypes } = require("sequelize"); // column type definitions
const { sequelize } = require("../config/db"); // shared database connection

const Booking = sequelize.define("Booking", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // facilityId and requesterId columns are added automatically by the associations
  // in models/index.js (Booking.belongsTo(Facility...) etc.) — we don't need to
  // declare them by hand here, Sequelize creates the foreign key columns for us.
  startDateTime: {
    type: DataTypes.DATE, // stores both date AND time together
    allowNull: false,
  },
  endDateTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  purpose: {
    type: DataTypes.STRING, // free text reason for booking, e.g. "Guest lecture"
  },
  eventName: {
    type: DataTypes.STRING, // short title for the event
  },
  attendeeCount: {
    type: DataTypes.INTEGER, // how many people are expected — checked against facility capacity
    defaultValue: 1,
  },
  status: {
    type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED", "CANCELLED"), // only these four values allowed
    defaultValue: "PENDING",
  },
  cancellationReason: {
    type: DataTypes.STRING, // filled in only when status becomes CANCELLED
    allowNull: true,
  },
  cancelledAt: {
    type: DataTypes.DATE, // timestamp of when cancellation happened — used for audit/history
    allowNull: true,
  },
}, {
  timestamps: true, // adds createdAt / updatedAt columns automatically for every booking
});

module.exports = Booking; // export the model for use in routes
