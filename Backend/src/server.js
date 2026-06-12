require("./config/env");

const app = require("./app");
const sequelize = require("./config/database");
const logger = require("./utils/logger");
const config = require("./config/env");

async function startServer() {
  try {
    await sequelize.authenticate();

    logger.info("Conexión a MariaDB correcta", {
      database: process.env.DB4,
      host: process.env.DB_HOST4,
      environment: config.nodeEnv,
    });

    app.listen(config.port, "0.0.0.0", () => {
      logger.info(`Servidor backend activo en http://localhost:${config.port}`, {
        port: config.port,
        envFile: config.envFile,
      });
    });
  } catch (error) {
    logger.error("Error al iniciar backend", {
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    });
    process.exit(1);
  }
}

startServer();
