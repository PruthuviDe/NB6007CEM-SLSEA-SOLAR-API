'use strict';

const { verifyToken } = require('../helpers/token');

/**
 * Authentication Middleware
 * 
 * Verifies JWT Bearer token on protected routes per WSO2 REST API Guidelines Section 12.
 * Enforces standard WWW-Authenticate challenge header on HTTP 401 Unauthorized responses.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.setHeader(
      'WWW-Authenticate',
      'Bearer error="invalid_token", error_description="Missing or malformed Bearer authorization token"'
    );
    return res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
      description: 'Missing or malformed Authorization header. Provide a valid Bearer token.',
      timestamp: new Date().toISOString()
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.setHeader(
      'WWW-Authenticate',
      `Bearer error="invalid_token", error_description="${err.message}"`
    );
    return res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
      description: err.name === 'TokenExpiredError'
        ? 'The access token has expired. Please re-authenticate.'
        : 'The provided access token is malformed or signature verification failed.',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Scope Authorization Guard Middleware Factory
 * 
 * Verifies that the authenticated user possesses the required scope string.
 * Returns HTTP 403 Forbidden with WSO2 error envelope if scope is missing.
 * 
 * @param {string} requiredScope - Scope identifier (e.g. 'read:national')
 */
function requireScope(requiredScope) {
  return (req, res, next) => {
    if (!req.user || !Array.isArray(req.user.scopes)) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Access denied',
        description: 'User possesses no authorized security scopes.',
        timestamp: new Date().toISOString()
      });
    }

    const hasScope = req.user.scopes.includes(requiredScope);
    if (!hasScope) {
      return res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
        description: `Access requires scope '${requiredScope}'. Granted scopes: [${req.user.scopes.join(', ')}].`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireScope
};
