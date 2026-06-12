const { Sequelize } = require("sequelize");
const logger = require("../utils/logger");

const sequelize = new Sequelize(
  process.env.DB4,
  process.env.DB_USER4,
  process.env.DB_PASSWORD4,
  {
    host: process.env.DB_HOST4,
    dialect: "mysql",
    timezone: "-05:00",
    logging: process.env.DB_LOGGING === "true" ? (msg) => logger.debug(msg) : false,
    define: {
      freezeTableName: true,
      timestamps: false,
    },
    pool: {
      max: Number(process.env.DB_POOL_MAX || 10),
      min: Number(process.env.DB_POOL_MIN || 0),
      acquire: Number(process.env.DB_POOL_ACQUIRE || 30000),
      idle: Number(process.env.DB_POOL_IDLE || 10000),
    },
    dialectOptions: {
      charset: "utf8mb4",
    },
  },
);

module.exports = sequelize;
