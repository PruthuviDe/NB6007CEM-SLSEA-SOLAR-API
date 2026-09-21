/**
 * Global Error Handler Middleware
 * Adheres strictly to WSO2 REST API Guidelines Section 11 (Consistent Error Handling)
 * Returns a standardized error envelope:
 * {
 *   "code": "ERROR_CODE",
 *   "message": "Human readable summary",
 *   "description": "Specific detail or validation feedback",
 *   "timestamp": "ISO-8601 UTC timestamp"
 * }
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const statusCode = err.status || err.statusCode || 500;
  
  // Default code mappings
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  if (statusCode === 400 && !err.code) code = 'BAD_REQUEST';
  if (statusCode === 401 && !err.code) code = 'UNAUTHORIZED';
  if (statusCode === 403 && !err.code) code = 'FORBIDDEN';
  if (statusCode === 404 && !err.code) code = 'NOT_FOUND';
  if (statusCode === 406 && !err.code) code = 'NOT_ACCEPTABLE';
  if (statusCode === 409 && !err.code) code = 'CONFLICT';
  if (statusCode === 412 && !err.code) code = 'PRECONDITION_FAILED';
  if (statusCode === 415 && !err.code) code = 'UNSUPPORTED_MEDIA_TYPE';

  const errorResponse = {
    code,
    message: err.message || 'An unexpected error occurred processing your request.',
    description: err.description || err.details || (statusCode === 500 ? 'Internal server error. Please contact SLSEA support.' : err.message),
    timestamp: new Date().toISOString()
  };

  // Log 500 errors in development/production (skip in test environment to keep test logs clean)
  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR 500] ${req.method} ${req.originalUrl}:`, err.stack || err);
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
