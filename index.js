const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { testConnection } = require("./config/database");
const { syncDatabase } = require("./models");
const logger = require("./utils/logger");
const loggerMiddleware = require("./middleware/loggerMiddleware");

// Import routes
const authRoutes = require("./routes/authRoutes");
const cashRoutes = require("./routes/cashRoutes");
const chatRoutes = require("./routes/chatRoutes");

const orderRoutes = require("./routes/orderRoutes");
const bakingListRoutes = require("./routes/bakingListRoutes");
const productRoutes = require("./routes/productRoutes");

const app = express();
const PORT = 5000;

// Configure middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(bodyParser.json());
app.use(loggerMiddleware);

// Initialize database
logger.info("Initializing application...");
testConnection().then(async (connected) => {
  if (connected) {
    await syncDatabase();
    const productSeeder = require("./seeders/productSeeder");
    await productSeeder
      .seed()
      .catch((err) => logger.error("Error in product seeder:", err));
  } else {
    logger.error("Failed to connect to database. Exiting...");
    process.exit(1);
  }
});

// Register routes
app.use("/", authRoutes);
app.use("/cash", cashRoutes);
app.use("/chat", chatRoutes);

// Admin routes
app.use("/orders", orderRoutes);
app.use("/baking-list", bakingListRoutes);
app.use("/products", productRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled application error:", err);
  res.status(500).json({ error: "An unexpected error occurred" });
});

// Starting the server
app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info("Available routes:");
  logger.info("  POST /register - Register a new user");
  logger.info("  POST /login - Login a user");
  logger.info("  POST /cash - Add a cash entry (authenticated)");
  logger.info("  GET /cash - Get cash entries (authenticated)");
  logger.info("  GET /chat - Get all chat messages (authenticated)");
  logger.info("  POST /chat - Post a new chat message (authenticated)");
});
