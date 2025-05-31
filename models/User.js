const { DataTypes } = require("sequelize");
const logger = require("../utils/logger");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      hooks: {
        beforeCreate: (user) => {
          logger.info(`Creating new user: ${user.username}`);
        },
        afterCreate: (user) => {
          logger.info(`User created with ID: ${user.id}`);
        },
      },
    },
  );

  return User;
};
