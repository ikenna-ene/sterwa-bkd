"use strict";
process.env.TZ = 'Africa/Lagos';
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI ||
  "mongodb+srv://ene_db:ene_db@cluster0.b5aptjw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

if (!uri) {
  throw new Error("MONGODB_URI environment variable not set.");
}

const client = new MongoClient(uri, {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
});

let db;
let usersCollection;
let user_login_data

/**
 * Connects to MongoDB and sets up collections + indexes
 */
async function initializeDatabase() {
  try {
    console.log("Attempting MongoDB connection...");
    await client.connect();
    db = client.db("sterwa-db");
    usersCollection = db.collection("user-accounts");
    user_login_data = db.collection("user-login-data");
    await usersCollection.createIndex({ email: 1 }, { unique: true });

    console.log("✅ MongoDB connected | Database: sterwa-db");
    console.log("   - Collection 'user-accounts' is ready with unique email index");
  } catch (error) {
    console.error("⛔ FAILED to connect to MongoDB:");
    console.error(error.message);
    console.error("Full error:", error);
    if (process.env.NODE_ENV === 'test') {
      console.warn("Running in test mode - continuing without DB (some tests will fail)");
      // Optional: do NOT exit in tests
      // process.exit(1);  ← comment this out or make conditional
    } else {
      process.exit(1);
    }
  }
};

async function closeDatabase() {
  try {
    await client.close();
    console.log("🔌 MongoDB connection closed.");
    return;
  } catch (error) {
    console.error("⛔ Error closing MongoDB connection:", error);
    process.exit(1);
  }
};

/**
 * Register a new user
 * @param {Object} userData
 * @param {string} userData.email
 * @param {string} userData.password    (plain text – should be hashed in production!)
 * @param {string} userData.phoneNumber
 * @param {string} userData.country
 * @returns {Promise<{success: boolean, message: string, user?: any}>}
 */
async function registerUser({ email, username, password, phoneNumber, country }) {
  try {

    const normalizedEmail = email.toLowerCase().trim();
    const result = await usersCollection.insertOne({
      email: normalizedEmail,
      username: username,
      password,               // WARNING: Hash this in production!
      phoneNumber: phoneNumber.trim(),
      country: country.trim(),
      createdAt: new Date(),
      balData: {
        bal: 0,
        profit: 0,
        dateUpdated: ''
      }
    });

    return {
      success: true,
      message: "Account created successfully",
      user: {
        id: result.insertedId.toString(),
        username: username,
        bal: 0
      }
    };
  } catch (error) {
    if (error.code === 11000) { // Duplicate key (email already exists)
      return {
        success: false,
        message: "This email is already registered"
      };
    }

    console.error("Registration error:", error);
    return {
      success: false,
      message: "Failed to create account. Please try again later."
    };
  }
};


async function storeLoginData(login_data) {
  try {

    const result = await user_login_data.insertOne(login_data);
    if(!result) {
      console.log('data not stored to db..');
      return {
        success: false,
        message: "failed to store login data"
      };
    };

    return {
      success: true,
      message: "login data stored successfully",
    };

  } catch (error) {
    console.error("storage error:", error);
    return {
      success: false,
      message: "failed to store login data"
    };
  }
};


async function getUserLastLoginData(email) {
  try {
    if (!email || typeof email !== 'string') {
      return {
        success: false,
        message: "Valid email is required"
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get the most recent document for this user
    const lastLogin = await user_login_data.findOne(
      { email: normalizedEmail },
      { sort: { _id: -1 } }   // newest first (based on insertion order)
    );

    if (!lastLogin) {
      return {
        success: false,
        message: "No previous login record found"
      };
    }

    return {
      success: true,
      data: lastLogin
    };

  } catch (error) {
    console.error("getUserLastLoginData error:", error);
    return {
      success: false,
      message: "Failed to retrieve last login data"
    };
  }
}

/**
 * Find user by email (used for login)
 * @param {string} email
 * @returns {Promise<{success: boolean, user?: any, message?: string}>}
 */
async function findUserByEmail(email) {
  try {
    const user = await usersCollection.findOne({
      email: email.toLowerCase().trim()
    });

    if (!user) {
      return {
        success: false,
        message: "user not found"
      };
    }

    return {
      success: true,
      user
    };

  } catch (error) {
    console.error("Find user error:", error);
    return {
      success: false,
      message: "Database error"
    };
  }
}

module.exports = {
  initializeDatabase,
  closeDatabase,
  registerUser,
  findUserByEmail,
  getUserLastLoginData,
  storeLoginData
};