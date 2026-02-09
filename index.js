"use strict";

const cron = require("node-cron");
const http = require("http");
const { app, initializeDatabase, closeDatabase } = require("./server.js");

// Create HTTP server using the Express app
const server = http.createServer(app);

// ────────────────────────────────────────────────
//           CRON JOBS
// ────────────────────────────────────────────────
async function setupCronJobs() {
  // Example: restart / crash at 2:00 AM Nigerian time
  cron.schedule('0 2 * * *', async () => {
    console.log('🌅 Scheduled restart at 2:00 AM WAT');
    await closeDatabase();
    process.exit(1); // or perform cleanup & restart logic
  }, {
    scheduled: true,
    timezone: "Africa/Lagos"
  });

  console.log('📅 Cron jobs scheduled');
}

// ────────────────────────────────────────────────
//           START SERVER
// ────────────────────────────────────────────────
async function startServer() {
  try {
    // Initialize MongoDB connection
    await initializeDatabase();
    console.log("Database initialized successfully");

    const PORT = process.env.PORT || 5100;

    server.listen(PORT, async () => {
      console.log(`🟢 Server is live on port ${PORT}`);
      await setupCronJobs();
    });

    // Error handling
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        process.exit(1);
      }
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log("🔄 Shutting down server...");
      server.close(async (err) => {
        if (err) {
          console.error("❌ Error closing server:", err);
        } else {
          console.log("✅ Server closed gracefully");
        }
        process.exit(0);
      });

      // Force exit after timeout
      setTimeout(() => {
        console.log("⚠️ Forcing shutdown...");
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('SIGQUIT', shutdown);

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start everything
startServer();