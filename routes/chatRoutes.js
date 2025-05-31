const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { authenticate } = require("../middleware/authMiddleware");

// Chat routes (all protected)
router.get("/", authenticate, chatController.getChatMessages);
router.post("/", authenticate, chatController.addChatMessage);

module.exports = router;
