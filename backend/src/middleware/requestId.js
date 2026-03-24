const { randomUUID } = require('crypto');

const MAX_REQUEST_ID_LENGTH = 128;

function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const requestId =
    typeof incomingId === 'string' &&
    incomingId.trim().length > 0 &&
    incomingId.trim().length <= MAX_REQUEST_ID_LENGTH
      ? incomingId.trim()
      : randomUUID();

  req.id = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

module.exports = {
  requestIdMiddleware,
};
