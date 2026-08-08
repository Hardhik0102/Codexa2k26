// models/AdjustmentRequest.js
// Defines the "adjustment_requests" table — a peer-to-peer request to swap or
// relinquish someone else's booked slot. Foreign keys and relationships are
// wired up in models/index.js.

const { DataTypes } = require("sequelize"); // column type definitions
const { sequelize } = require("../config/db"); // shared database connection

const AdjustmentRequest = sequelize.define("AdjustmentRequest", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // requesterId and targetBookingId columns are added automatically by the
  // associations in models/index.js — we don't declare them by hand here.
  requestType: {
    type: DataTypes.ENUM("SWAP", "RELINQUISH"), // whether this is a straight relinquish or a two-way swap
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING, // the note explaining why the slot is being requested
  },
  status: {
    type: DataTypes.ENUM("PENDING", "ACCEPTED", "DECLINED"), // current state of the negotiation
    defaultValue: "PENDING",
  },
  respondedAt: {
    type: DataTypes.DATE, // timestamp of when the target user accepted/declined — null until then
    allowNull: true,
  },
}, {
  timestamps: true, // adds createdAt (when the request was sent) and updatedAt automatically
});

module.exports = AdjustmentRequest; // export the model
