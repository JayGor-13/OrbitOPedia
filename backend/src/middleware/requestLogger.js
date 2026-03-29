/**
 * Structured request logger middleware.
 *
 * Logs method, path, status, and response-time in a consistent format.
 * Morgan already handles HTTP access logs; this middleware adds structured
 * JSON logging that can be forwarded to AWS CloudWatch / GCP Logging.
 */

function requestLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip,
    };

    // In production, output JSON for log aggregation services (CloudWatch, etc.)
    if (process.env.NODE_ENV === "production") {
      process.stdout.write(JSON.stringify(logEntry) + "\n");
    }
  });

  next();
}

module.exports = requestLogger;
