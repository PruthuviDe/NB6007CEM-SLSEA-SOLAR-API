'use strict';

/**
 * Device Write-Isolation Guard Middleware
 * 
 * CRITICAL BRIEF RULE (§2 & §3, TASK-018):
 * Enforces the Producer-Consumer write isolation boundary.
 * Smart meters can ONLY push telemetry for their own assigned installation ID.
 * Attempting to ingest telemetry for a different installation ID is immediately
 * blocked with HTTP 403 Forbidden.
 */
function deviceWriteGuard(req, res, next) {
  const targetInstallationId = parseInt(req.params.id, 10);

  if (isNaN(targetInstallationId)) {
    return res.status(400).json({
      code: 'INVALID_ID_FORMAT',
      message: 'Invalid installation identifier',
      description: 'The requested installation ID must be a valid integer.',
      timestamp: new Date().toISOString()
    });
  }

  // Verify authenticated identity exists
  if (!req.user || !Array.isArray(req.user.scopes)) {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Access denied',
      description: 'Authentication required with write credentials.',
      timestamp: new Date().toISOString()
    });
  }

  // Check write scope
  const hasWriteScope = req.user.scopes.includes('installation:write');
  if (!hasWriteScope) {
    return res.status(403).json({
      code: 'FORBIDDEN',
      message: 'Write permission denied',
      description: 'The authenticated token does not possess the required "installation:write" scope.',
      timestamp: new Date().toISOString()
    });
  }

  // Check device-installation ID match
  if (req.user.installation_id !== targetInstallationId) {
    return res.status(403).json({
      code: 'DEVICE_WRITE_VIOLATION',
      message: 'Device write isolation violation',
      description: `Smart meter token is authorized strictly for installation ID ${req.user.installation_id}. Ingestion to installation ID ${targetInstallationId} is forbidden.`,
      timestamp: new Date().toISOString()
    });
  }

  next();
}

module.exports = {
  deviceWriteGuard
};
