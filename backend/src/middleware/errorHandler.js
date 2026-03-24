const config = require('../config');
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const requestId = req.id || req.headers['x-request-id'] || null;

  const logPayload = {
    path: req.path,
    method: req.method,
    status: err.status || 500,
    error: err.message,
    requestId,
  };

  if (config.env !== 'production') {
    logPayload.stack = err.stack;
  }

  logger.error('Unhandled error', logPayload);

  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || (err.message === 'Not allowed by CORS' ? 403 : 500);
  const response = {
    status: 'error',
    message: status === 500 ? 'Internal server error' : err.message,
  };

  return res.status(status).json(response);
}

module.exports = errorHandler;
