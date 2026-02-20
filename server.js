// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
  initializeDatabase,
  registerUser,
  findUserByEmail,
  storeLoginData,
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
  const { email, username, password, phoneNumber, country } = req.body;

  if (!email || !username || !password || !phoneNumber || !country) {
    return res.json({
      success: false,
      message: "All fields are required: email, username, password, phoneNumber, country"
    });
  }

  let db_user = await findUserByEmail(email);
  let db_email; db_user.success?db_email = db_user.user.email:db_email = null;
  //console.log(db_email, db_user);

  if (db_email!=null && email == db_email) {
    return res.json({
      success: false,
      message: "Account already registered in db.."
    });
  }


  const result = await registerUser({ email, username, password, phoneNumber, country });

  if (result.success) {
    console.log('new account created on: ', );
    return res.json({
      success: true,
      message: "Account created successfully",
      user: result.user
    });
  }

  return res.json({
    success: false,
    message: "Failed to create account..",

  });
});

// ────────────────────────────────────────────────
//                  LOGIN
// ────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({
      success: false,
      message: "Email and password are required"
    });
  }

  const result = await findUserByEmail(email);

  if (!result.success) {
    console.log('user not found...');
    return res.json({
      success: false,
      message: "user not found"
    });
  }

  const user = result.user;

  let db_password = user.password;
  if(password!==db_password) {
    return res.json({
      success: false,
      message: "incorrect user password"
    });
  }

  return res.json({
    success: true,
    message: "Login successful",
    //user: user
    user: {
      username: user.username,
      email: user.email,
      bal: user.balData.bal,
      profit: user.balData.profit
    }
  });
});

app.post("/api/auth/store-login-data", async (req, res) => {
  const { username, email, bal, profit, lastLogin } = req.body;


  if (!username && !email && !bal && !profit && !lastLogin) {
    return res.json({
      success: false,
      message: "incomplete login data.."
    });
  }

  let login_data = {username, email, bal, profit, lastLogin};
  const result = await storeLoginData(login_data);

  if (!result.success) {
    console.log('server error...');
    return res.json({
      success: false,
      message: "server error.."
    });
  }


  return res.json({
    success: true,
    message: "Login data stored successfully...",
  });
});

// Export the app so index.js can use it
module.exports = { app, initializeDatabase, closeDatabase };