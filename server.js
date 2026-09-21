const app = require('./src/app');
const config = require('./src/config/env');

const PORT = process.env.PORT || config.port;

const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`⚡ SLSEA Solar Telemetry REST API`);
  console.log(`🌐 Environment: ${config.nodeEnv}`);
  console.log(`🚀 Server listening on port: ${PORT}`);
  console.log(`📍 Root URL: http://localhost:${PORT}/`);
  console.log(`🩺 Health Probe: http://localhost:${PORT}/api/v1/health`);
  console.log('====================================================');
});

// Graceful process shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n[${signal}] Initiating graceful shutdown...`);
  server.close(() => {
    console.log('HTTP server closed cleanly. Process exiting.');
    process.exit(0);
  });

  // Force exit after 10 seconds if lingering connections exist
  setTimeout(() => {
    console.error('Forcing process exit after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;
