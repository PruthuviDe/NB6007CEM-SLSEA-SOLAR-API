const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const apiRoutes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { validateAcceptHeader, validateContentTypeHeader } = require('./middleware/contentNegotiation');

const app = express();

// 1. Security HTTP Headers
app.use(helmet({
  contentSecurityPolicy: false, // Allows Swagger UI to load external fonts/styles
  crossOriginEmbedderPolicy: false
}));

// 2. Cross-Origin Resource Sharing
app.use(cors());

// 3. Body Parsing Middleware with Strict JSON Syntax Error Guard
app.use(express.json({ limit: '1mb' }));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      code: 'INVALID_JSON_SYNTAX',
      message: 'Malformed JSON payload in request body.',
      description: err.message,
      timestamp: new Date().toISOString()
    });
  }
  next(err);
});

// 4. Content Negotiation & Media Type Enforcement (WSO2 §8.1, §9)
app.use(validateAcceptHeader);
app.use(validateContentTypeHeader);

// 5. Session 2 Base Root Endpoint (matches coursework lecture expectation)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    session: 'NB6007CEM S2 Scaffolding',
    service: 'SLSEA Solar Generation Telemetry API',
    api_v1: '/api/v1',
    health: '/api/v1/health'
  });
});

// 6. Mount API v1 Routes
app.use('/api/v1', apiRoutes);

// 6. 404 Unmapped Resource Handler
app.use(notFound);

// 7. Global WSO2 Section 11 Standard Error Handler
app.use(errorHandler);

module.exports = app;
