// server.js
// This is the entry point of the whole backend. Running "node server.js" starts everything.

require("dotenv").config(); // loads variables from the .env file into process.env (must be the very first thing that runs)

const express = require("express"); // the web framework we use to build our REST API
const cors = require("cors"); // middleware that allows our frontend (running on a different port/origin) to call this API
const path = require("path"); // Node's built-in module for working with file paths
const { connectDB } = require("./config/db"); // our function that connects to PostgreSQL and syncs tables

// Import all our route files — each one handles a specific "area" of the app
const authRoutes = require("./routes/auth");
const facilityRoutes = require("./routes/facilities");
const bookingRoutes = require("./routes/bookings");
const adjustmentRoutes = require("./routes/adjustments");
const adminRoutes = require("./routes/admin");
const analyticsRoutes = require("./routes/analytics");

const app = express(); // create the Express application

app.use(cors()); // enable Cross-Origin Resource Sharing so the frontend can call this API without being blocked by the browser
app.use(express.json()); // automatically parse incoming JSON request bodies into req.body

// Mount each route file at a specific URL prefix — e.g. everything in auth.js becomes available under /api/auth/...
app.use("/api/auth", authRoutes);
app.use("/api/facilities", facilityRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/adjustments", adjustmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);

// Serve the frontend's static files (HTML/CSS/JS) directly from Express, so you don't
// need a separate frontend server — everything runs from one "npm start" command.
app.use(express.static(path.join(__dirname, "../frontend"))); // "../frontend" points up one level from backend/ into the frontend folder

const PORT = process.env.PORT || 5000; // use the port from .env, or default to 5000 if not set

// We wrap startup in an async function because connecting to PostgreSQL takes a moment,
// and we don't want the server accepting requests before the database is ready.
async function startServer() {
  await connectDB(); // connect to PostgreSQL and sync (create) tables BEFORE accepting any requests

  app.listen(PORT, () => {
    // start listening for requests, and log a friendly message once ready
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer(); // kick everything off
