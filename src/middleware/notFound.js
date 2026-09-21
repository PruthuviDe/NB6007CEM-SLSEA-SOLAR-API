/**
 * 404 Not Found Middleware
 * Handles requests to undefined endpoints returning a standard WSO2 Section 11 envelope
 */
const notFound = (req, res, next) => {
  const error = new Error(`Cannot ${req.method} ${req.originalUrl}`);
  error.status = 404;
  error.code = 'RESOURCE_NOT_FOUND';
  error.description = `The requested URI '${req.originalUrl}' does not exist on this server.`;
  next(error);
};

module.exports = notFound;
