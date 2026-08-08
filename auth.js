// routes/auth.js
// Handles logging in. Kept intentionally simple for a hackathon — no JWT tokens,
// we just confirm the password and send back the user's id + role. The frontend
// stores this in localStorage and includes the user id on future requests.

const express = require("express"); // web framework used to define routes
const router = express.Router(); // a mini "sub-app" just for auth-related routes
const { User } = require("../models"); // the User model, imported from our central models/index.js

// POST /api/auth/login
// Expects JSON body: { email, password }
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body; // pull email and password out of the request body

    // Look up the user by email using Sequelize's findOne — returns null if no match found
    const user = await User.findOne({ where: { email: email.toLowerCase() } }); // "where" describes the SQL WHERE clause

    if (!user) {
      // No account with that email exists
      return res.status(401).json({ success: false, message: "Invalid email or password" }); // 401 = unauthorized
    }

    // Compare the submitted password against the stored hash using the method we defined on the User model
    const isMatch = await user.comparePassword(password); // returns true/false

    if (!isMatch) {
      // Password is wrong
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Login succeeded — send back the minimal info the frontend needs
    res.json({
      success: true, // tells the frontend the login worked
      user: {
        id: user.id, // PostgreSQL's auto-incrementing integer id for this user
        name: user.name, // display name
        email: user.email, // their email
        role: user.role, // "student" or "admin" — used by the frontend to show/hide admin features
      },
    });
  } catch (error) {
    // Catches any unexpected error (e.g. database connection issue)
    res.status(500).json({ success: false, message: error.message }); // 500 = server error
  }
});

module.exports = router; // export so server.js can mount this at /api/auth
