const express = require('express');
const router = express.Router();
const healthRoutes = require('./health.routes');

const authRoutes = require('./auth.routes');

// Mount health and diagnostics
router.use('/', healthRoutes);

// Mount authentication and security layer (Phase 4)
router.use('/auth', authRoutes);

// API v1 Service Discovery root
router.get('/', (req, res) => {
  res.status(200).json({
    name: 'SLSEA Solar Generation Telemetry REST API',
    version: 'v1',
    authority: 'Sri Lanka Sustainable Energy Authority (SLSEA)',
    specification: 'WSO2 REST API Guidelines (Level 2)',
    endpoints: {
      health: '/api/v1/health',
      docs: '/api-docs',
      auth: {
        login: 'POST /api/v1/auth/login',
        device_token: 'POST /api/v1/auth/device-token',
        me: 'GET /api/v1/auth/me'
      },
      provinces: '/api/v1/provinces (Phase 5)',
      districts: '/api/v1/districts (Phase 5)',
      grid_substations: '/api/v1/grid-substations (Phase 5)',
      solar_installations: '/api/v1/solar-installations (Phase 5)',
      generation_readings: '/api/v1/solar-installations/:id/readings (Phase 5/6)'
    }
  });
});

module.exports = router;
