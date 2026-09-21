const app = require('./src/app');
const config = require('./src/config/env');
const { connectDB, disconnectDB } = require('./src/data/db');

const PORT = process.env.PORT || config.port;

let server;

// Start server after initializing database connection
const startServer = async () => {
  try {
    await connectDB();
    server = app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`⚡ SLSEA Solar Telemetry REST API`);
      console.log(`🌐 Environment: ${config.nodeEnv}`);
      console.log(`🚀 Server listening on port: ${PORT}`);
      console.log(`📍 Root URL: http://localhost:${PORT}/`);
      console.log(`🩺 Health Probe: http://localhost:${PORT}/api/v1/health`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

startServer();

// Graceful process shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n[${signal}] Initiating graceful shutdown...`);
  if (server) {
    server.close(async () => {
      await disconnectDB();
      console.log('HTTP server and Database closed cleanly. Process exiting.');
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }

  // Force exit after 10 seconds if lingering connections exist
  setTimeout(() => {
    console.error('Forcing process exit after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;

