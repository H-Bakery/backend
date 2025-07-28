const express = require("express");
const router = express.Router();
const unsoldProductController = require("../controllers/unsoldProductController");
const { authenticate } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(authenticate);

// Unsold product routes
router.post("/", unsoldProductController.addUnsoldProduct);
router.get("/", unsoldProductController.getUnsoldProducts);
router.get("/summary", unsoldProductController.getUnsoldProductsSummary);

module.exports = router;