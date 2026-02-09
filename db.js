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

/**
 * Connects to MongoDB and sets up collections + indexes
 */
async function initializeDatabase() {
  try {
    console.log("Attempting MongoDB connection...");
    await client.connect();
    db = client.db("sterwa-db");
    usersCollection = db.collection("user-accounts");

    await usersCollection.createIndex({ email: 1 }, { unique: true });

    console.log("✅ MongoDB connected | Database: sterwa-db");
    console.log("   - Collection 'user-accounts' ready with unique email index");
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
async function registerUser({ email, password, phoneNumber, country }) {
  try {
    const normalizedEmail = email.toLowerCase().trim();

    const result = await usersCollection.insertOne({
      email: normalizedEmail,
      password,               // WARNING: Hash this in production!
      phoneNumber: phoneNumber.trim(),
      country: country.trim(),
      createdAt: new Date(),
    });

    return {
      success: true,
      message: "Account created successfully",
      user: {
        id: result.insertedId.toString(),
        email: normalizedEmail,
        phoneNumber,
        country
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
        message: "User not found"
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
};