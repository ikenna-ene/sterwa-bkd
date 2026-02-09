// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
  initializeDatabase,
  registerUser,
  findUserByEmail,
  closeDatabase
} = require("./db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint (basic)
app.get("/", (req, res) => {
  res.send('App is hosted and active..');
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    time: new Date().toISOString()
  });
});

// ────────────────────────────────────────────────
//                  SIGNUP
// ────────────────────────────────────────────────
app.post("/api/auth/signup", async (req, res) => {
  const { email, password, phoneNumber, country } = req.body;

  if (!email || !password || !phoneNumber || !country) {
    return res.status(400).json({
      success: false,
      message: "All fields are required: email, password, phoneNumber, country"
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long"
    });
  }

  const result = await registerUser({ email, password, phoneNumber, country });

  if (result.success) {
    return res.status(201).json(result);
  }

  return res.status(400).json(result);
});

// ────────────────────────────────────────────────
//                  LOGIN
// ────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  const result = await findUserByEmail(email);

  if (!result.success) {
    console.log('user not found...');
    return res.status(401).json({
      success: false,
      message: "user not found"
    });
  }

  const user = result.user;

  // WARNING: This is insecure — use bcrypt in production!
  if (user.password !== password) {
    console.log('user entered the wrong password..');
    return res.status(401).json({
      success: false,
      message: "Invalid password"
    });
  }

  return res.json({
    success: true,
    message: "Login successful",
    user: {
      id: user._id.toString(),
      email: user.email,
      phoneNumber: user.phoneNumber,
      country: user.country
    }
  });
});

// Export the app so index.js can use it
module.exports = { app, initializeDatabase, closeDatabase };