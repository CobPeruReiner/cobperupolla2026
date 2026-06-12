const { ZodError } = require("zod");
const { fail } = require("../utils/apiResponse");
const logger = require("../utils/logger");

function friendlyZodErrors(error) {
  return error.issues.map((issue) => ({
    campo: issue.path.join("."),
    mensaje: issue.message,
  }));
}

function errorHandler(err, req, res, next) {
  if (err && err.message && err.message.startsWith("Origen no permitido por CORS")) {
    return fail(res, {
      status: 403,
      code: "CORS_ORIGIN_NOT_ALLOWED",
      message: "El origen del frontend no está autorizado. Revisa la variable FRONTEND_URL del backend.",
    });
  }

  if (err instanceof ZodError) {
    return fail(res, {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Revisa los datos ingresados. Hay campos pendientes o con formato incorrecto.",
      errors: friendlyZodErrors(err),
    });
  }

  logger.error("Error no controlado", {
    requestId: req.requestId,
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });

  return fail(res, {
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "Ocurrió un inconveniente al procesar la solicitud. Inténtalo nuevamente en unos segundos.",
  });
}

module.exports = errorHandler;
