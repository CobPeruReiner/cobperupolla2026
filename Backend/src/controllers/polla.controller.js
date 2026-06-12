const { registrarPronosticoSchema, dniSchema } = require("../validators/polla.validator");
const pollaService = require("../services/polla.service");
const { success, fail } = require("../utils/apiResponse");
const logger = require("../utils/logger");

async function obtenerCatalogo(req, res) {
  logger.debug("Cargando catálogo de polla", { requestId: req.requestId });

  const catalogo = await pollaService.obtenerCatalogo();

  if (!catalogo.evento) {
    return fail(res, {
      status: 404,
      code: "EVENTO_NO_ACTIVO",
      message: "Aún no hay un evento activo para mostrar. Comunícate con Sistemas.",
    });
  }

  return success(res, {
    message: "Catálogo cargado correctamente.",
    data: catalogo,
    meta: {
      totalGrupos: catalogo.totalGrupos,
      totalSeleccionesEsperadas: catalogo.totalSeleccionesEsperadas,
    },
    extra: {
      // Compatibilidad directa para el frontend si consume evento/grupos en raíz.
      evento: catalogo.evento,
      grupos: catalogo.grupos,
    },
  });
}

async function registrarPronostico(req, res) {
  const payload = registrarPronosticoSchema.parse(req.body);

  logger.debug("Validación inicial correcta para registro de pronóstico", {
    requestId: req.requestId,
    dni: payload.participante.dni,
    totalGrupos: payload.selecciones.length,
  });

  const resultado = await pollaService.registrarPronostico({
    participante: payload.participante,
    selecciones: payload.selecciones,
    ipRegistro: req.ip || null,
    userAgent: req.headers["user-agent"] || null,
    requestId: req.requestId,
  });

  if (!resultado.ok) {
    return fail(res, {
      status: resultado.status,
      code: resultado.code,
      message: resultado.message,
      details: resultado.details,
    });
  }

  return success(res, {
    status: resultado.status,
    message: resultado.message,
    data: resultado.data,
  });
}

async function consultarPronosticoPorDni(req, res) {
  const { dni } = dniSchema.parse(req.params);

  const resultado = await pollaService.consultarPronosticoPorDni(dni);

  if (!resultado.existe) {
    return success(res, {
      message: "Este DNI aún no tiene pronóstico registrado.",
      data: resultado,
    });
  }

  return success(res, {
    message: resultado.confirmado
      ? "Este DNI ya tiene un pronóstico confirmado."
      : "Este DNI tiene un pronóstico en borrador.",
    data: resultado,
  });
}

async function obtenerRanking(req, res) {
  const ranking = await pollaService.obtenerRanking();

  return success(res, {
    message: "Ranking cargado correctamente.",
    data: {
      ranking,
    },
    meta: {
      totalParticipantes: ranking.length,
    },
  });
}

async function obtenerResumen(req, res) {
  const resumen = await pollaService.obtenerResumen();

  return success(res, {
    message: "Resumen cargado correctamente.",
    data: resumen,
  });
}


async function obtenerReporteRegistros(req, res) {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const estado = typeof req.query.estado === "string" ? req.query.estado : "";

  logger.debug("Cargando reporte de registros de polla", {
    requestId: req.requestId,
    q,
    estado,
  });

  const reporte = await pollaService.obtenerReporteRegistros({ q, estado });

  return success(res, {
    message: "Reporte de registros cargado correctamente.",
    data: reporte,
    meta: {
      totalRegistros: reporte.resumen.totalRegistros,
      confirmados: reporte.resumen.confirmados,
      borradores: reporte.resumen.borradores,
      anulados: reporte.resumen.anulados,
    },
  });
}


module.exports = {
  obtenerCatalogo,
  registrarPronostico,
  consultarPronosticoPorDni,
  obtenerRanking,
  obtenerResumen,
  obtenerReporteRegistros,
};
