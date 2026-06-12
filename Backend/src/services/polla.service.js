const { QueryTypes } = require("sequelize");
const sequelize = require("../config/database");
const logger = require("../utils/logger");

const GRUPOS_ESPERADOS = 12;
const SELECCIONES_POR_GRUPO = 2;

async function obtenerEventoActivo(options = {}) {
  const rows = await sequelize.query(
    `
    SELECT
      e.id_evento,
      e.nombre,
      e.descripcion,
      e.fecha_inicio,
      e.fecha_limite,
      CASE WHEN NOW() <= e.fecha_limite THEN 1 ELSE 0 END AS registro_abierto,
      NOW() AS fecha_servidor
    FROM polla_evento e
    WHERE e.activo = 1
    ORDER BY e.id_evento DESC
    LIMIT 1
    `,
    {
      type: QueryTypes.SELECT,
      transaction: options.transaction,
    },
  );

  return rows[0] || null;
}

async function obtenerCatalogo() {
  const evento = await obtenerEventoActivo();

  if (!evento) {
    return {
      evento: null,
      grupos: [],
      totalGrupos: 0,
      totalSeleccionesEsperadas: 0,
    };
  }

  const rows = await sequelize.query(
    `
    SELECT
      g.id_grupo,
      g.letra,
      g.nombre AS grupo,
      g.orden,
      gp.id_grupo_pais,
      gp.posicion,
      p.id_pais,
      p.nombre AS pais,
      p.codigo_iso
    FROM polla_grupo g
    INNER JOIN polla_grupo_pais gp
      ON gp.id_grupo = g.id_grupo
    INNER JOIN polla_pais p
      ON p.id_pais = gp.id_pais
    WHERE g.id_evento = :idEvento
      AND g.activo = 1
      AND p.activo = 1
    ORDER BY g.orden ASC, gp.posicion ASC
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { idEvento: evento.id_evento },
    },
  );

  const gruposMap = new Map();

  for (const row of rows) {
    if (!gruposMap.has(row.letra)) {
      gruposMap.set(row.letra, {
        idGrupo: row.id_grupo,
        letra: row.letra,
        nombre: row.grupo,
        orden: row.orden,
        paises: [],
      });
    }

    gruposMap.get(row.letra).paises.push({
      idGrupoPais: row.id_grupo_pais,
      idPais: row.id_pais,
      nombre: row.pais,
      codigoIso: row.codigo_iso,
      posicion: row.posicion,
    });
  }

  const grupos = Array.from(gruposMap.values());

  return {
    evento: {
      idEvento: evento.id_evento,
      nombre: evento.nombre,
      descripcion: evento.descripcion,
      fechaInicio: evento.fecha_inicio,
      fechaLimite: evento.fecha_limite,
      fechaServidor: evento.fecha_servidor,
      registroAbierto: Boolean(evento.registro_abierto),
    },
    grupos,
    totalGrupos: grupos.length,
    totalSeleccionesEsperadas: grupos.length * SELECCIONES_POR_GRUPO,
  };
}

function normalizarSelecciones(selecciones) {
  return selecciones.map((item) => ({
    grupo: item.grupo.trim().toUpperCase(),
    paises: item.paises.map((pais) => (typeof pais === "string" ? pais.trim() : pais)),
  }));
}

async function obtenerLetrasGruposActivos(idEvento, transaction) {
  const rows = await sequelize.query(
    `
    SELECT letra
    FROM polla_grupo
    WHERE id_evento = :idEvento
      AND activo = 1
    ORDER BY orden ASC
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { idEvento },
      transaction,
    },
  );

  return rows.map((row) => row.letra);
}

async function resolverGrupoPais({ idEvento, grupo, paisSeleccionado, transaction }) {
  if (typeof paisSeleccionado === "number") {
    const rows = await sequelize.query(
      `
      SELECT
        gp.id_grupo_pais,
        g.letra,
        p.nombre AS pais
      FROM polla_grupo_pais gp
      INNER JOIN polla_grupo g
        ON g.id_grupo = gp.id_grupo
      INNER JOIN polla_pais p
        ON p.id_pais = gp.id_pais
      WHERE g.id_evento = :idEvento
        AND g.letra = :grupo
        AND gp.id_grupo_pais = :idGrupoPais
        AND g.activo = 1
        AND p.activo = 1
      LIMIT 1
      `,
      {
        type: QueryTypes.SELECT,
        replacements: {
          idEvento,
          grupo,
          idGrupoPais: paisSeleccionado,
        },
        transaction,
      },
    );

    return rows[0] || null;
  }

  const rows = await sequelize.query(
    `
    SELECT
      gp.id_grupo_pais,
      g.letra,
      p.nombre AS pais
    FROM polla_grupo_pais gp
    INNER JOIN polla_grupo g
      ON g.id_grupo = gp.id_grupo
    INNER JOIN polla_pais p
      ON p.id_pais = gp.id_pais
    WHERE g.id_evento = :idEvento
      AND g.letra = :grupo
      AND p.nombre = :pais
      AND g.activo = 1
      AND p.activo = 1
    LIMIT 1
    `,
    {
      type: QueryTypes.SELECT,
      replacements: {
        idEvento,
        grupo,
        pais: paisSeleccionado,
      },
      transaction,
    },
  );

  return rows[0] || null;
}

async function upsertParticipante(participante, transaction) {
  await sequelize.query(
    `
    INSERT INTO polla_participante (
      nombre_completo,
      dni,
      cargo,
      activo
    )
    VALUES (
      :nombreCompleto,
      :dni,
      :cargo,
      1
    )
    ON DUPLICATE KEY UPDATE
      nombre_completo = VALUES(nombre_completo),
      cargo = VALUES(cargo),
      activo = 1,
      fecha_actualizacion = NOW()
    `,
    {
      replacements: {
        nombreCompleto: participante.nombreCompleto,
        dni: participante.dni,
        cargo: participante.cargo,
      },
      transaction,
    },
  );

  const rows = await sequelize.query(
    `
    SELECT id_participante, nombre_completo, dni, cargo
    FROM polla_participante
    WHERE dni = :dni
    LIMIT 1
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { dni: participante.dni },
      transaction,
    },
  );

  return rows[0];
}

async function obtenerPronosticoExistente({ idEvento, idParticipante, transaction }) {
  const rows = await sequelize.query(
    `
    SELECT id_pronostico, estado, fecha_confirmacion
    FROM polla_pronostico
    WHERE id_evento = :idEvento
      AND id_participante = :idParticipante
    LIMIT 1
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { idEvento, idParticipante },
      transaction,
    },
  );

  return rows[0] || null;
}

async function crearPronostico({ idEvento, idParticipante, ipRegistro, userAgent, transaction }) {
  await sequelize.query(
    `
    INSERT INTO polla_pronostico (
      id_evento,
      id_participante,
      estado,
      ip_registro,
      user_agent
    )
    VALUES (
      :idEvento,
      :idParticipante,
      'BORRADOR',
      :ipRegistro,
      :userAgent
    )
    `,
    {
      replacements: {
        idEvento,
        idParticipante,
        ipRegistro,
        userAgent,
      },
      transaction,
    },
  );

  const rows = await sequelize.query(
    "SELECT LAST_INSERT_ID() AS idPronostico",
    {
      type: QueryTypes.SELECT,
      transaction,
    },
  );

  return rows[0].idPronostico;
}

async function insertarDetallePronostico({ idPronostico, idGrupoPais, transaction }) {
  await sequelize.query(
    `
    INSERT INTO polla_pronostico_detalle (
      id_pronostico,
      id_grupo_pais
    )
    VALUES (
      :idPronostico,
      :idGrupoPais
    )
    `,
    {
      replacements: { idPronostico, idGrupoPais },
      transaction,
    },
  );
}

async function registrarPronostico({ participante, selecciones, ipRegistro, userAgent, requestId }) {
  const transaction = await sequelize.transaction();

  try {
    const evento = await obtenerEventoActivo({ transaction });

    if (!evento) {
      await transaction.rollback();
      return {
        ok: false,
        status: 400,
        code: "EVENTO_NO_ACTIVO",
        message: "Por el momento no hay una polla activa para registrar pronósticos.",
      };
    }

    if (!evento.registro_abierto) {
      await transaction.rollback();
      return {
        ok: false,
        status: 400,
        code: "REGISTRO_CERRADO",
        message: "La fecha límite ya venció. El pronóstico no puede ser registrado.",
        details: {
          fechaLimite: evento.fecha_limite,
          fechaServidor: evento.fecha_servidor,
        },
      };
    }

    const gruposActivos = await obtenerLetrasGruposActivos(evento.id_evento, transaction);

    if (gruposActivos.length !== GRUPOS_ESPERADOS) {
      await transaction.rollback();
      return {
        ok: false,
        status: 500,
        code: "CATALOGO_INCOMPLETO",
        message: "El catálogo de grupos aún no está completo. Comunícate con Sistemas para validarlo.",
        details: {
          gruposConfigurados: gruposActivos.length,
          gruposEsperados: GRUPOS_ESPERADOS,
        },
      };
    }

    const seleccionesNormalizadas = normalizarSelecciones(selecciones);
    const letrasEnviadas = seleccionesNormalizadas.map((item) => item.grupo).sort();
    const letrasEsperadas = [...gruposActivos].sort();
    const faltantes = letrasEsperadas.filter((letra) => !letrasEnviadas.includes(letra));
    const sobrantes = letrasEnviadas.filter((letra) => !letrasEsperadas.includes(letra));

    if (faltantes.length || sobrantes.length) {
      await transaction.rollback();
      return {
        ok: false,
        status: 400,
        code: "GRUPOS_INVALIDOS",
        message: "Debes completar todos los grupos disponibles antes de confirmar.",
        details: {
          gruposFaltantes: faltantes,
          gruposNoValidos: sobrantes,
        },
      };
    }

    const participanteDb = await upsertParticipante(participante, transaction);

    const pronosticoExistente = await obtenerPronosticoExistente({
      idEvento: evento.id_evento,
      idParticipante: participanteDb.id_participante,
      transaction,
    });

    if (pronosticoExistente && pronosticoExistente.estado === "CONFIRMADO") {
      await transaction.rollback();
      return {
        ok: false,
        status: 409,
        code: "PRONOSTICO_YA_CONFIRMADO",
        message: "Este DNI ya tiene un pronóstico confirmado. Si necesitas corregirlo, comunícate con Sistemas.",
        details: {
          fechaConfirmacion: pronosticoExistente.fecha_confirmacion,
        },
      };
    }

    const resumenSelecciones = [];
    const idsGrupoPais = [];

    for (const item of seleccionesNormalizadas) {
      const paisesGrupo = [];

      for (const paisSeleccionado of item.paises) {
        const grupoPais = await resolverGrupoPais({
          idEvento: evento.id_evento,
          grupo: item.grupo,
          paisSeleccionado,
          transaction,
        });

        if (!grupoPais) {
          await transaction.rollback();
          return {
            ok: false,
            status: 400,
            code: "PAIS_INVALIDO",
            message: `La selección del Grupo ${item.grupo} no es válida. Revisa los países marcados.`,
            details: {
              grupo: item.grupo,
              paisSeleccionado,
            },
          };
        }

        idsGrupoPais.push(grupoPais.id_grupo_pais);
        paisesGrupo.push({
          idGrupoPais: grupoPais.id_grupo_pais,
          pais: grupoPais.pais,
        });
      }

      resumenSelecciones.push({
        grupo: item.grupo,
        paises: paisesGrupo,
      });
    }

    const idsUnicos = new Set(idsGrupoPais);
    if (idsUnicos.size !== idsGrupoPais.length) {
      await transaction.rollback();
      return {
        ok: false,
        status: 400,
        code: "SELECCION_DUPLICADA",
        message: "Hay países duplicados en la selección. Revisa tu pronóstico antes de confirmar.",
      };
    }

    let idPronostico;

    if (pronosticoExistente) {
      idPronostico = pronosticoExistente.id_pronostico;

      await sequelize.query(
        `
        DELETE FROM polla_pronostico_detalle
        WHERE id_pronostico = :idPronostico
        `,
        {
          replacements: { idPronostico },
          transaction,
        },
      );

      await sequelize.query(
        `
        UPDATE polla_pronostico
        SET estado = 'BORRADOR',
            ip_registro = :ipRegistro,
            user_agent = :userAgent,
            fecha_actualizacion = NOW()
        WHERE id_pronostico = :idPronostico
        `,
        {
          replacements: {
            idPronostico,
            ipRegistro,
            userAgent,
          },
          transaction,
        },
      );
    } else {
      idPronostico = await crearPronostico({
        idEvento: evento.id_evento,
        idParticipante: participanteDb.id_participante,
        ipRegistro,
        userAgent,
        transaction,
      });
    }

    for (const idGrupoPais of idsGrupoPais) {
      await insertarDetallePronostico({ idPronostico, idGrupoPais, transaction });
    }

    await sequelize.query(
      `
      UPDATE polla_pronostico
      SET estado = 'CONFIRMADO',
          fecha_confirmacion = NOW(),
          fecha_actualizacion = NOW()
      WHERE id_pronostico = :idPronostico
      `,
      {
        replacements: { idPronostico },
        transaction,
      },
    );

    await transaction.commit();

    logger.info("Pronóstico confirmado", {
      requestId,
      idPronostico,
      dni: participanteDb.dni,
      totalSelecciones: idsGrupoPais.length,
    });

    return {
      ok: true,
      status: 201,
      message: "¡Listo! Tu pronóstico fue registrado correctamente.",
      data: {
        idPronostico,
        participante: {
          idParticipante: participanteDb.id_participante,
          nombreCompleto: participanteDb.nombre_completo,
          dni: participanteDb.dni,
          cargo: participanteDb.cargo,
        },
        evento: {
          idEvento: evento.id_evento,
          nombre: evento.nombre,
        },
        resumen: resumenSelecciones,
        totalSelecciones: idsGrupoPais.length,
      },
    };
  } catch (error) {
    await transaction.rollback();
    logger.error("Error registrando pronóstico", {
      requestId,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    });
    throw error;
  }
}

async function consultarPronosticoPorDni(dni) {
  const evento = await obtenerEventoActivo();

  if (!evento) {
    return {
      existe: false,
      confirmado: false,
      participante: null,
      pronostico: null,
      selecciones: [],
    };
  }

  const rows = await sequelize.query(
    `
    SELECT
      pa.id_participante,
      pa.nombre_completo,
      pa.dni,
      pa.cargo,
      pr.id_pronostico,
      pr.estado,
      pr.fecha_confirmacion,
      g.letra,
      g.nombre AS grupo,
      p.nombre AS pais,
      gp.id_grupo_pais
    FROM polla_participante pa
    INNER JOIN polla_pronostico pr
      ON pr.id_participante = pa.id_participante
    LEFT JOIN polla_pronostico_detalle d
      ON d.id_pronostico = pr.id_pronostico
    LEFT JOIN polla_grupo_pais gp
      ON gp.id_grupo_pais = d.id_grupo_pais
    LEFT JOIN polla_grupo g
      ON g.id_grupo = gp.id_grupo
    LEFT JOIN polla_pais p
      ON p.id_pais = gp.id_pais
    WHERE pa.dni = :dni
      AND pr.id_evento = :idEvento
    ORDER BY g.orden ASC, gp.posicion ASC
    `,
    {
      type: QueryTypes.SELECT,
      replacements: {
        dni,
        idEvento: evento.id_evento,
      },
    },
  );

  if (!rows.length) {
    return {
      existe: false,
      confirmado: false,
      participante: null,
      pronostico: null,
      selecciones: [],
    };
  }

  const first = rows[0];
  const gruposMap = new Map();

  for (const row of rows) {
    if (!row.letra) continue;

    if (!gruposMap.has(row.letra)) {
      gruposMap.set(row.letra, {
        grupo: row.letra,
        nombre: row.grupo,
        paises: [],
      });
    }

    gruposMap.get(row.letra).paises.push({
      idGrupoPais: row.id_grupo_pais,
      nombre: row.pais,
    });
  }

  return {
    existe: true,
    confirmado: first.estado === "CONFIRMADO",
    participante: {
      idParticipante: first.id_participante,
      nombreCompleto: first.nombre_completo,
      dni: first.dni,
      cargo: first.cargo,
    },
    pronostico: {
      idPronostico: first.id_pronostico,
      estado: first.estado,
      fechaConfirmacion: first.fecha_confirmacion,
    },
    selecciones: Array.from(gruposMap.values()),
  };
}

async function obtenerRanking() {
  const evento = await obtenerEventoActivo();

  if (!evento) return [];

  return sequelize.query(
    `
    SELECT
      pa.nombre_completo AS nombreCompleto,
      pa.dni,
      pa.cargo,
      pr.id_pronostico AS idPronostico,
      pr.fecha_confirmacion AS fechaConfirmacion,
      SUM(CASE WHEN gp.clasificado_real = 1 THEN 1 ELSE 0 END) AS puntaje,
      COUNT(d.id_pronostico_detalle) AS totalMarcados
    FROM polla_pronostico pr
    INNER JOIN polla_participante pa
      ON pa.id_participante = pr.id_participante
    INNER JOIN polla_pronostico_detalle d
      ON d.id_pronostico = pr.id_pronostico
    INNER JOIN polla_grupo_pais gp
      ON gp.id_grupo_pais = d.id_grupo_pais
    WHERE pr.id_evento = :idEvento
      AND pr.estado = 'CONFIRMADO'
    GROUP BY
      pa.id_participante,
      pa.nombre_completo,
      pa.dni,
      pa.cargo,
      pr.id_pronostico,
      pr.fecha_confirmacion
    ORDER BY puntaje DESC, pr.fecha_confirmacion ASC, pa.nombre_completo ASC
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { idEvento: evento.id_evento },
    },
  );
}

async function obtenerResumen() {
  const evento = await obtenerEventoActivo();

  if (!evento) {
    return {
      evento: null,
      participantesConfirmados: 0,
      totalPronosticos: 0,
    };
  }

  const rows = await sequelize.query(
    `
    SELECT
      COUNT(*) AS totalPronosticos,
      SUM(CASE WHEN estado = 'CONFIRMADO' THEN 1 ELSE 0 END) AS participantesConfirmados,
      SUM(CASE WHEN estado = 'BORRADOR' THEN 1 ELSE 0 END) AS borradores
    FROM polla_pronostico
    WHERE id_evento = :idEvento
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { idEvento: evento.id_evento },
    },
  );

  return {
    evento: {
      idEvento: evento.id_evento,
      nombre: evento.nombre,
      fechaLimite: evento.fecha_limite,
      fechaServidor: evento.fecha_servidor,
      registroAbierto: Boolean(evento.registro_abierto),
    },
    totalPronosticos: Number(rows[0].totalPronosticos || 0),
    participantesConfirmados: Number(rows[0].participantesConfirmados || 0),
    borradores: Number(rows[0].borradores || 0),
  };
}

module.exports = {
  obtenerCatalogo,
  registrarPronostico,
  consultarPronosticoPorDni,
  obtenerRanking,
  obtenerResumen,
};
