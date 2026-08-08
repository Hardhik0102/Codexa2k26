// models/Facility.js
// Defines the "facilities" table — bookable resources like Seminar Hall, 3D Printer, etc.

const { DataTypes } = require("sequelize"); // column type definitions
const { sequelize } = require("../config/db"); // shared database connection

const Facility = sequelize.define("Facility", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true, // PostgreSQL auto-assigns 1, 2, 3...
  },
  name: {
    type: DataTypes.STRING, // e.g. "Main Seminar Hall"
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING, // e.g. "Seminar Hall", "3D Printer", "Conference Room"
    allowNull: false,
  },
  capacity: {
    type: DataTypes.INTEGER, // maximum number of attendees this facility can hold
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING, // e.g. "Main Block"
    allowNull: false,
  },
  restricted: {
    type: DataTypes.BOOLEAN, // true = bookings need admin approval before becoming APPROVED
    defaultValue: false,
  },
  autoApprove: {
    type: DataTypes.BOOLEAN, // true = bookings become APPROVED instantly with no admin step
    defaultValue: true,
  },
  status: {
    type: DataTypes.ENUM("ACTIVE", "INACTIVE", "MAINTENANCE"), // only these three values allowed
    defaultValue: "ACTIVE",
  },
}, {
  timestamps: true, // adds createdAt / updatedAt columns automatically
});

module.exports = Facility; // export the model for use in routes
