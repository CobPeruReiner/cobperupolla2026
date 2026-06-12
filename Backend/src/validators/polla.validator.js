const { z } = require("zod");

const paisSeleccionSchema = z.union([
  z.number().int().positive(),
  z.string().trim().min(1, "El país seleccionado no puede estar vacío."),
]);

const participanteSchema = z.object({
  nombreCompleto: z
    .string({ error: "El nombre completo es obligatorio." })
    .trim()
    .min(3, "Ingresa el nombre completo del participante." )
    .max(150, "El nombre completo no debe superar 150 caracteres."),
  dni: z
    .string({ error: "El DNI es obligatorio." })
    .trim()
    .regex(/^[0-9]{8,15}$/, "El DNI debe contener solo números y tener entre 8 y 15 dígitos."),
  cargo: z
    .string({ error: "El cargo es obligatorio." })
    .trim()
    .min(2, "Ingresa el cargo del participante." )
    .max(100, "El cargo no debe superar 100 caracteres."),
});

const seleccionSchema = z.object({
  grupo: z
    .string({ error: "El grupo es obligatorio." })
    .trim()
    .toUpperCase()
    .regex(/^[A-L]$/, "El grupo debe estar entre A y L."),
  paises: z
    .array(paisSeleccionSchema, { error: "Debes enviar los países seleccionados." })
    .length(2, "Debes seleccionar exactamente 2 países por grupo."),
});

const registrarPronosticoSchema = z
  .object({
    participante: participanteSchema,
    selecciones: z
      .array(seleccionSchema, { error: "Debes enviar las selecciones de los grupos." })
      .length(12, "Debes completar los 12 grupos antes de confirmar."),
  })
  .superRefine((data, ctx) => {
    const grupos = data.selecciones.map((item) => item.grupo);
    const gruposUnicos = new Set(grupos);

    if (gruposUnicos.size !== grupos.length) {
      ctx.addIssue({
        code: "custom",
        path: ["selecciones"],
        message: "Hay grupos repetidos. Cada grupo debe enviarse una sola vez.",
      });
    }

    for (const item of data.selecciones) {
      const paises = item.paises.map((pais) => String(pais).trim().toLowerCase());
      const paisesUnicos = new Set(paises);

      if (paisesUnicos.size !== paises.length) {
        ctx.addIssue({
          code: "custom",
          path: ["selecciones", item.grupo, "paises"],
          message: `En el Grupo ${item.grupo} no puedes seleccionar el mismo país dos veces.`,
        });
      }
    }
  });

const dniSchema = z.object({
  dni: z
    .string({ error: "El DNI es obligatorio." })
    .trim()
    .regex(/^[0-9]{8,15}$/, "El DNI debe contener solo números y tener entre 8 y 15 dígitos."),
});

module.exports = {
  registrarPronosticoSchema,
  dniSchema,
};
