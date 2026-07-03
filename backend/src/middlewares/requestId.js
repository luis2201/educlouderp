const crypto = require('crypto');

function requestId(req, res, next) {
  const incomingId = req.get('x-request-id');
  const id = incomingId && incomingId.length <= 120 ? incomingId : crypto.randomUUID();

  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}

module.exports = requestId;
