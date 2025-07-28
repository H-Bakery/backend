const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const SECRET_KEY = "your_secret_key";

const authenticate = (req, res, next) => {
  logger.info("Authenticating request...");
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    logger.info("Authentication failed: No authorization header provided");
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : authHeader;

  if (!token) {
    logger.info("Authentication failed: No token provided");
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      logger.error("Authentication failed: Invalid token", err);
      return res.status(401).json({ error: "Invalid token" });
    }

    req.userId = decoded.id;
    logger.info(`Authentication successful for user ID: ${req.userId}`);
    next();
  });
};

module.exports = { authenticate, SECRET_KEY };
