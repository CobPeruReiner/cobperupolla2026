const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const config = require("./config/env");
const pollaRoutes = require("./routes/polla.routes");
const requestLogger = require("./middlewares/requestLogger");
const errorHandler = require("./middlewares/errorHandler");
const { fail } = require("./utils/apiResponse");
const logger = require("./utils/logger");

const app = express();

const allowedOrigins = config.frontendUrl
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const frontendIndexPath = path.join(config.frontendBuildPath, "index.html");
const frontendBuildExists = fs.existsSync(frontendIndexPath);

app.disable("x-powered-by");
app.set("trust proxy", true);

app.use(
  cors({
    origin(origin, callback) {
      // Permite requests mismo origen, curl, Postman y healthchecks sin Origin.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.get("/api", (req, res) => {
  res.json({
    ok: true,
    message: "API Polla COBPERU activa.",
    service: "backend-polla-cobperu",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Backend activo y listo para recibir solicitudes.",
    service: "backend-polla-cobperu",
    environment: config.nodeEnv,
    frontendBuild: frontendBuildExists ? "disponible" : "no_montado",
    frontendBuildPath: config.frontendBuildPath,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/polla", pollaRoutes);

app.use("/api", (req, res) => {
  return fail(res, {
    status: 404,
    code: "API_ROUTE_NOT_FOUND",
    message: "La ruta solicitada no existe. Verifica la URL o comunícate con Sistemas.",
  });
});

if (frontendBuildExists) {
  logger.info("Build del frontend detectado. El backend servirá la aplicación web.", {
    frontendBuildPath: config.frontendBuildPath,
  });

  app.use(
    express.static(config.frontendBuildPath, {
      maxAge: config.nodeEnv === "production" ? "1d" : 0,
      index: false,
    }),
  );

  // Fallback SPA para React/Vite. No interfiere con /api.
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(frontendIndexPath);
    }

    return next();
  });
} else {
  logger.warn("No se encontró build del frontend. El backend quedará solo como API.", {
    frontendBuildPath: config.frontendBuildPath,
    expectedIndex: frontendIndexPath,
  });

  app.get("/", (req, res) => {
    res.json({
      ok: true,
      message: "API Polla COBPERU activa. El build del frontend aún no está montado.",
      service: "backend-polla-cobperu",
      frontendBuildPath: config.frontendBuildPath,
    });
  });
}

app.use((req, res) => {
  return fail(res, {
    status: 404,
    code: "ROUTE_NOT_FOUND",
    message: "No encontramos la página solicitada. Verifica la URL o comunícate con Sistemas.",
  });
});

app.use(errorHandler);

module.exports = app;
