const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const config = require('../config/env');

/**
 * @route   GET /api/v1/health
 * @desc    Operational health check and system diagnostics probe
 * @access  Public
 */
router.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  const healthData = {
    status: dbState === 1 ? 'pass' : 'warn',
    service: 'SLSEA Solar Generation Telemetry API',
    version: '1.0.0',
    environment: config.nodeEnv,
    database: {
      status: dbStatus,
      target: 'MongoDB Atlas (AWS Singapore/Mumbai)'
    },
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    memory_usage: {
      rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    },
    documentation: `${config.baseUrl}/api-docs`
  };

  res.status(200).json(healthData);
});

module.exports = router;
