const express = require('express');
const router = express.Router();
const config = require('../config/env');

/**
 * @route   GET /api/v1/health
 * @desc    Operational health check and system diagnostics probe
 * @access  Public
 */
router.get('/health', (req, res) => {
  const healthData = {
    status: 'pass',
    service: 'SLSEA Solar Generation Telemetry API',
    version: '1.0.0',
    environment: config.nodeEnv,
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
