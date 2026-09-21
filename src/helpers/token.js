'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Compute dynamic JWT scopes based on user role and jurisdiction boundaries
 * per WSO2 REST API Guidelines Section 12.2 and Coursework Brief Section 2.
 * 
 * @param {Object} user - User document or object
 * @returns {string[]} Array of computed scope strings
 */
function computeUserScopes(user) {
  if (!user) return [];

  if (user.role === 'national_analyst' || user.jurisdiction_level === 'national') {
    return ['read:national'];
  }

  if (user.role === 'provincial_operator' || user.jurisdiction_level === 'province') {
    return [`read:province:${user.jurisdiction_id}`];
  }

  if (user.role === 'district_operator' || user.jurisdiction_level === 'district') {
    return [`read:district:${user.jurisdiction_id}`];
  }

  return [];
}

/**
 * Generate a signed JWT for human SLSEA personnel (read clients)
 * 
 * @param {Object} user - User model instance
 * @returns {string} Signed JWT Bearer token
 */
function generateUserToken(user) {
  const scopes = computeUserScopes(user);

  const payload = {
    sub: user.user_id,
    username: user.username,
    full_name: user.full_name,
    role: user.role,
    jurisdiction_level: user.jurisdiction_level,
    jurisdiction_id: user.jurisdiction_id,
    scopes: scopes
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}

/**
 * Generate a signed JWT for smart meters / solar inverters (write clients)
 * 
 * CRITICAL BRIEF RULE (§2 & §3):
 * The smart meter authenticates on behalf of its parent SolarInstallation
 * carrying the write scope isolated strictly to its installation_id.
 * 
 * @param {number} installationId - The target SolarInstallation ID
 * @returns {string} Signed device JWT Bearer token
 */
function generateDeviceToken(installationId) {
  const payload = {
    sub: `device:${installationId}`,
    installation_id: installationId,
    type: 'device',
    scopes: ['installation:write']
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}

/**
 * Verify and decode an inbound JWT Bearer token
 * 
 * @param {string} token - Raw JWT string
 * @returns {Object} Decoded token payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = {
  computeUserScopes,
  generateUserToken,
  generateDeviceToken,
  verifyToken
};
