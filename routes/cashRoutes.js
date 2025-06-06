const express = require("express");
const router = express.Router();
const cashController = require("../controllers/cashController");
const { authenticate } = require("../middleware/authMiddleware");

// Cash routes (all protected)
router.post("/", authenticate, cashController.addCashEntry);
router.get("/", authenticate, cashController.getCashEntries);

module.exports = router;
