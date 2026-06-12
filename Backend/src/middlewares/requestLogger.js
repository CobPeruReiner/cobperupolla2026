const logger = require("../utils/logger");

function requestLogger(req, res, next) {
  const startedAt = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  req.requestId = requestId;

  logger.debug("Solicitud recibida", {
    requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
  });

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    logger.info("Solicitud atendida", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
    });
  });

  next();
}

module.exports = requestLogger;
