const models = require("../models");
const logger = require("../utils/logger");

module.exports = {
  seed: async () => {
    try {
      // Check if Product model exists before trying to use it
      if (!models.Product) {
        logger.error("Product model not found. Skipping product seeding.");
        return;
      }

      const productCount = await models.Product.count();

      if (productCount === 0) {
        await models.Product.bulkCreate([
          { name: "White Bread", price: 3.99, stock: 5, dailyTarget: 20 },
          { name: "Croissant", price: 2.5, stock: 8, dailyTarget: 30 },
          { name: "Chocolate Muffin", price: 3.25, stock: 3, dailyTarget: 15 },
          { name: "Sourdough Bread", price: 4.99, stock: 2, dailyTarget: 10 },
          { name: "Baguette", price: 2.99, stock: 6, dailyTarget: 25 },
        ]);
        logger.info("Product seed data created successfully");
      } else {
        logger.info("Products already exist, skipping seed");
      }
    } catch (error) {
      logger.error("Error seeding products:", error);
    }
  },
};
