'use strict';

const express = require('express');
const router = express.Router();
const { User, SolarInstallation } = require('../data/models');
const { generateUserToken, generateDeviceToken, computeUserScopes } = require('../helpers/token');
const { authenticateToken } = require('../middleware/auth');

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate human SLSEA personnel and issue scoped JWT Bearer token
 * @access  Public
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Missing required credentials',
        description: 'Both "username" and "password" fields are required in the request body.',
        timestamp: new Date().toISOString()
      });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      res.setHeader('WWW-Authenticate', 'Bearer error="invalid_grant", error_description="Invalid credentials"');
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Authentication failed',
        description: 'The username or password provided is incorrect.',
        timestamp: new Date().toISOString()
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.setHeader('WWW-Authenticate', 'Bearer error="invalid_grant", error_description="Invalid credentials"');
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Authentication failed',
        description: 'The username or password provided is incorrect.',
        timestamp: new Date().toISOString()
      });
    }

    const token = generateUserToken(user);
    const scopes = computeUserScopes(user);

    return res.status(200).json({
      token,
      token_type: 'Bearer',
      expires_in: '24h',
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        jurisdiction_level: user.jurisdiction_level,
        jurisdiction_id: user.jurisdiction_id,
        scopes: scopes
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/v1/auth/device-token
 * @desc    Issue scoped write-only JWT for autonomous smart meters
 *          CRITICAL BRIEF RULE (§2 & §3): Device identity is bound to parent SolarInstallation
 * @access  Public
 */
router.post('/device-token', async (req, res, next) => {
  try {
    const { installation_id, meter_id } = req.body || {};

    if (!installation_id || !meter_id) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Missing device credentials',
        description: 'Both "installation_id" and "meter_id" are required to issue an autonomous device token.',
        timestamp: new Date().toISOString()
      });
    }

    const targetId = parseInt(installation_id, 10);
    if (isNaN(targetId)) {
      return res.status(400).json({
        code: 'INVALID_ID_FORMAT',
        message: 'Invalid installation identifier',
        description: 'The "installation_id" must be a valid integer.',
        timestamp: new Date().toISOString()
      });
    }

    const installation = await SolarInstallation.findOne({
      installation_id: targetId,
      meter_id: meter_id.toUpperCase().trim()
    });

    if (!installation) {
      return res.status(404).json({
        code: 'INSTALLATION_NOT_FOUND',
        message: 'Solar installation not found',
        description: `No solar installation found matching installation ID ${targetId} and meter ID '${meter_id}'.`,
        timestamp: new Date().toISOString()
      });
    }

    const token = generateDeviceToken(installation.installation_id);

    return res.status(200).json({
      token,
      token_type: 'Bearer',
      expires_in: '24h',
      device: {
        installation_id: installation.installation_id,
        meter_id: installation.meter_id,
        scopes: ['installation:write']
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get currently authenticated identity profile and granted scopes
 * @access  Protected (Bearer Token)
 */
router.get('/me', authenticateToken, (req, res) => {
  return res.status(200).json({
    authenticated: true,
    identity: req.user
  });
});

module.exports = router;
