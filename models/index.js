const { sequelize } = require("../config/database");
const { DataTypes } = require("sequelize");
const logger = require("../utils/logger");

// Import model definitions
const UserModel = require("./User");
const CashModel = require("./Cash");
const ChatModel = require("./Chat");
const ProductModel = require("./Product");
const OrderModel = require("./order");
const OrderItemModel = require("./orderItem");
const UnsoldProductModel = require("./unsoldProduct");
const RecipeModel = require("./Recipe");

// Initialize models with DataTypes
const User = UserModel(sequelize, DataTypes);
const Cash = CashModel(sequelize, DataTypes);
const Chat = ChatModel(sequelize, DataTypes);
const Product = ProductModel(sequelize, DataTypes);
const Order = OrderModel(sequelize, DataTypes);
const OrderItem = OrderItemModel(sequelize, DataTypes);
const UnsoldProduct = UnsoldProductModel(sequelize, DataTypes);
const Recipe = RecipeModel(sequelize, DataTypes);

logger.info("Setting up model relationships...");

// Define relationships
User.hasMany(Cash);
Cash.belongsTo(User);

User.hasMany(Chat);
Chat.belongsTo(User);

// Order relationships
Order.hasMany(OrderItem);
OrderItem.belongsTo(Order);

// UnsoldProduct relationships
User.hasMany(UnsoldProduct);
UnsoldProduct.belongsTo(User);
Product.hasMany(UnsoldProduct);
UnsoldProduct.belongsTo(Product);

// Sync all models with database
async function syncDatabase() {
  try {
    logger.info("Attempting to sync database models...");
    await sequelize.sync();
    logger.info("Database synchronized successfully");

    // Count existing records
    const userCount = await User.count();
    const cashCount = await Cash.count();
    const chatCount = await Chat.count();
    const productCount = await Product.count();
    const orderCount = await Order.count();
    const unsoldProductCount = await UnsoldProduct.count();
    const recipeCount = await Recipe.count();

    logger.info(
      `Database contains: ${userCount} users, ${cashCount} cash entries, ${chatCount} chat messages, ${productCount} products, ${orderCount} orders, ${unsoldProductCount} unsold product entries, ${recipeCount} recipes`,
    );
    return true;
  } catch (error) {
    logger.error("Unable to sync database:", error);
    throw error;
  }
}

module.exports = {
  sequelize,
  User,
  Cash,
  Chat,
  Product,
  Order, // Export the Order model
  OrderItem, // Export the OrderItem model
  UnsoldProduct, // Export the UnsoldProduct model
  Recipe, // Export the Recipe model
  syncDatabase,
};
