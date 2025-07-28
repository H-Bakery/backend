const express = require("express");
const router = express.Router();
const cashController = require("../controllers/cashController");
const { authenticate } = require("../middleware/authMiddleware");

// Cash routes (all protected)
router.post("/", authenticate, cashController.addCashEntry);
router.get("/", authenticate, cashController.getCashEntries);
router.get("/stats", authenticate, cashController.getCashStats);
router.put("/:id", authenticate, cashController.updateCashEntry);
router.delete("/:id", authenticate, cashController.deleteCashEntry);

module.exports = router;
