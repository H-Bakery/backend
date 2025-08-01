const express = require("express");
const router = express.Router();
const staffController = require("../controllers/staffController");
const { authenticate, requireAdmin } = require("../middleware/authMiddleware");

// All staff routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Staff management routes
router.get("/", staffController.getAllStaff); // GET /api/staff
router.get("/:id", staffController.getStaffById); // GET /api/staff/:id
router.post("/", staffController.createStaff); // POST /api/staff
router.put("/:id", staffController.updateStaff); // PUT /api/staff/:id
router.delete("/:id", staffController.deleteStaff); // DELETE /api/staff/:id

module.exports = router;