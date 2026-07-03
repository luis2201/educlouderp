function sanitizeObject(value) {
  if (!value || typeof value !== 'object') {
    return;
  }

  for (const key of Object.keys(value)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
      delete value[key];
      continue;
    }

    sanitizeObject(value[key]);
  }
}

function sanitizeInput(req, res, next) {
  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);
  next();
}

module.exports = sanitizeInput;
