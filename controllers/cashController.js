const { Cash } = require("../models");
const logger = require("../utils/logger");

// Add cash entry
exports.addCashEntry = async (req, res) => {
  logger.info("Processing cash entry request...");
  try {
    const { amount } = req.body;
    const date = new Date().toISOString().split("T")[0];
    logger.info(
      `Adding cash entry: ${amount} for user ${req.userId} on ${date}`,
    );

    const cashEntry = await Cash.create({
      UserId: req.userId,
      amount,
      date,
    });

    logger.info(`Cash entry created with ID: ${cashEntry.id}`);
    res.json({ message: "Cash entry saved" });
  } catch (error) {
    logger.error("Cash entry creation error:", error);
    res.status(500).json({ error: "Database error" });
  }
};

// Get cash entries for user
exports.getCashEntries = async (req, res) => {
  logger.info("Processing get cash entries request...");
  try {
    const entries = await Cash.findAll({
      where: { UserId: req.userId },
      order: [["date", "DESC"]],
    });

    logger.info(
      `Retrieved ${entries.length} cash entries for user ${req.userId}`,
    );
    res.json(entries);
  } catch (error) {
    logger.error("Error retrieving cash entries:", error);
    res.status(500).json({ error: "Database error" });
  }
};
