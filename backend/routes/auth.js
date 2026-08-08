// routes/auth.js
// Handles logging in. Kept intentionally simple for a hackathon — no JWT tokens,
// we just confirm the password and send back the user's id + role. The frontend
// stores this in localStorage and includes the user id on future requests.

const express = require("express"); // web framework used to define routes
const router = express.Router(); // a mini "sub-app" just for auth-related routes
const { User } = require("../models"); // the User model, imported from our central models/index.js

// POST /api/auth/login
// Expects JSON body: { email, password, portal }
router.post("/login", async (req, res) => {
  try {
    const { email, password, portal } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please enter your email ID and password." });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await User.findOne({ where: { email: cleanEmail } });

    if (portal === "admin") {
      if (!user) {
        return res.status(401).json({ success: false, message: "Admin account not found for this email ID." });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ success: false, message: "This email ID does not have Admin privileges. Please use the Student Portal." });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Incorrect password for admin account." });
      }
    } else {
      // Student Portal — if account doesn't exist yet, auto-create as student!
      if (!user) {
        const defaultName = cleanEmail.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Student";
        user = await User.create({
          name: defaultName,
          email: cleanEmail,
          password: password,
          role: "student",
        });
      } else {
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return res.status(401).json({ success: false, message: "Incorrect password for this email ID." });
        }
      }
    }

    // Login succeeded — send back user info
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/register
// Expects JSON body: { name, email, password, role }
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: "Please enter your name, email, and password." });
    }

    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "An account with this email already exists. Please log in." });
    }

    // Default role to "student" unless specified as "faculty" or "admin"
    const userRole = (role === "faculty" || role === "admin") ? role : "student";

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: userRole,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router; // export so server.js can mount this at /api/auth
