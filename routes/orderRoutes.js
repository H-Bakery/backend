const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authenticate } = require("../middleware/authMiddleware");

// Order CRUD routes - all protected with authentication
router.get("/", authenticate, orderController.getOrders);
router.get("/:id", authenticate, orderController.getOrder);
router.post("/", authenticate, orderController.createOrder);
router.put("/:id", authenticate, orderController.updateOrder);
router.delete("/:id", authenticate, orderController.deleteOrder);

module.exports = router;
