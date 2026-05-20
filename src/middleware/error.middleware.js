import { logger } from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  logger.error(`API Error: ${message}`, err, {
    path: req.path,
    method: req.method,
    status
  });

  res.status(status).json({
    message: message
  });
};
