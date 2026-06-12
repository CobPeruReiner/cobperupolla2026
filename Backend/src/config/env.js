const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env";
const envPath = path.resolve(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
} else {
  dotenv.config({ quiet: true });
}

const requiredEnv = ["DB_HOST4", "DB_USER4", "DB_PASSWORD4", "DB4"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.warn(
    `[CONFIG] Faltan variables de entorno: ${missingEnv.join(", ")}. Revisa tu archivo ${envFile} o las variables del contenedor.`,
  );
}

module.exports = {
  envFile,
  envPath,
  port: Number(process.env.PORT),
  nodeEnv: process.env.NODE_ENV,
  frontendUrl: process.env.FRONTEND_URL,
  frontendBuildPath: process.env.FRONTEND_BUILD_PATH
    ? path.resolve(process.env.FRONTEND_BUILD_PATH)
    : path.resolve(process.cwd(), "build"),
};
