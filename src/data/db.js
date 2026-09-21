const mongoose = require('mongoose');
const dns = require('dns');
const config = require('../config/env');

// Set fallback DNS servers (Google & Cloudflare) to ensure 100% reliable
// MongoDB Atlas SRV record resolution across all Windows and ISP environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignored if custom DNS cannot be set
}

/**
 * Connect to MongoDB Atlas
 */
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s if Atlas unreachable
      maxPoolSize: 10 // Efficient connection pooling
    });

    if (config.nodeEnv !== 'test') {
      console.log(`🌿 MongoDB Atlas Connected: ${conn.connection.host}`);
      console.log(`📦 Database: ${conn.connection.name}`);
    }

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Atlas Connection Error: ${error.message}`);
    if (config.nodeEnv !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

/**
 * Disconnect from MongoDB Atlas (used for test teardown and graceful shutdown)
 */
const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

// Connection event listeners
mongoose.connection.on('disconnected', () => {
  if (config.nodeEnv !== 'test') {
    console.warn('⚠️  MongoDB Atlas disconnected.');
  }
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB connection error: ${err.message}`);
});

module.exports = { connectDB, disconnectDB };
