const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
const logger = require("../utils/logger");
const { SECRET_KEY } = require("../middleware/authMiddleware");

// Register new user
exports.register = async (req, res) => {
  logger.info("Processing registration request...");
  try {
    const { username, password } = req.body;
    logger.info(`Attempting to register user: ${username}`);

    const hashedPassword = await bcrypt.hash(password, 10);
    logger.info("Password hashed successfully");

    const newUser = await User.create({
      username,
      password: hashedPassword,
    });

    logger.info(`User created successfully with ID: ${newUser.id}`);
    res.json({ message: "User created" });
  } catch (error) {
    logger.error("Registration error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      logger.info("Registration failed: Username already exists");
      return res.status(400).json({ error: "User exists" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

// Login user
exports.login = async (req, res) => {
  logger.info("Processing login request...");
  try {
    const { username, password } = req.body;
    logger.info(`Login attempt for user: ${username}`);

    const user = await User.findOne({ where: { username } });

    if (!user) {
      logger.info(`Login failed: User ${username} not found`);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    logger.info(`User found with ID: ${user.id}, validating password...`);
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      logger.info(`Login failed: Invalid password for user ${username}`);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    logger.info(`Password valid, generating token for user ${username}`);
    const token = jwt.sign({ id: user.id }, SECRET_KEY);
    logger.info("Login successful");
    res.json({ token });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
