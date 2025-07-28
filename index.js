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
const dashboardRoutes = require("./routes/dashboardRoutes");

const orderRoutes = require("./routes/orderRoutes");
const bakingListRoutes = require("./routes/bakingListRoutes");
const productRoutes = require("./routes/productRoutes");
const unsoldProductRoutes = require("./routes/unsoldProductRoutes");

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
    
    // Seed users first
    const userSeeder = require("./seeders/userSeeder");
    await userSeeder
      .seed()
      .catch((err) => logger.error("Error in user seeder:", err));
    
    // Then seed products
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
app.use("/dashboard", dashboardRoutes);

// Admin routes
app.use("/orders", orderRoutes);
app.use("/baking-list", bakingListRoutes);
app.use("/products", productRoutes);
app.use("/unsold-products", unsoldProductRoutes);

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
  logger.info("  PUT /cash/:id - Update a cash entry (authenticated)");
  logger.info("  DELETE /cash/:id - Delete a cash entry (authenticated)");
  logger.info("  GET /chat - Get all chat messages (authenticated)");
  logger.info("  POST /chat - Post a new chat message (authenticated)");
  logger.info("  GET /dashboard/sales-summary - Get sales analytics (authenticated)");
  logger.info("  GET /dashboard/production-overview - Get production analytics (authenticated)");
  logger.info("  GET /dashboard/revenue-analytics - Get revenue analytics (authenticated)");
  logger.info("  GET /dashboard/order-analytics - Get order analytics (authenticated)");
  logger.info("  GET /dashboard/product-performance - Get product performance (authenticated)");
  logger.info("  GET /dashboard/daily-metrics - Get daily metrics (authenticated)");
});
