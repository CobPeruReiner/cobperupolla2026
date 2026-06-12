/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Download,
  Eye,
  LoaderCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { obtenerReporteRegistros } from "../services/pollaApi";
import type { ReporteRegistro, ReporteRegistrosData } from "../types/polla";
import { formatDateLabel, formatDateTimeLabel } from "../utils/format";

interface ReporteRegistrosViewProps {
  onBack: () => void;
}

const GROUP_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
];

export function ReporteRegistrosView({ onBack }: ReporteRegistrosViewProps) {
  const [data, setData] = useState<ReporteRegistrosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const [selectedRegistro, setSelectedRegistro] =
    useState<ReporteRegistro | null>(null);

  useEffect(() => {
    cargarReporte();
  }, []);

  const registros = data?.registros || [];
  const resumen = data?.resumen;

  const totalParticipantesLabel = useMemo(() => {
    const total = resumen?.totalRegistros || 0;
    return `${total} ${total === 1 ? "registro" : "registros"}`;
  }, [resumen?.totalRegistros]);

  async function cargarReporte(params?: { q?: string; estado?: string }) {
    try {
      setLoading(true);
      setError(null);

      const response = await obtenerReporteRegistros({
        q: params?.q ?? q,
        estado: params?.estado ?? estado,
      });

      if (!response.data) {
        throw new Error("No se recibió información del reporte.");
      }

      console.debug("[PollaCOBPERU] Reporte de registros cargado", {
        total: response.data.resumen.totalRegistros,
        filtros: response.data.filtros,
      });

      setData(response.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo cargar el reporte.";
      console.error("[PollaCOBPERU] Error cargando reporte:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    cargarReporte({ q, estado });
  }

  function limpiarFiltros() {
    setQ("");
    setEstado("TODOS");
    cargarReporte({ q: "", estado: "TODOS" });
  }

  function exportarExcel() {
    if (!registros.length) {
      console.warn(
        "[PollaCOBPERU] Exportación cancelada: no hay registros para exportar.",
      );
      return;
    }

    const generatedAt = formatDateTimeLabel(new Date().toISOString());
    const filtrosAplicados =
      [
        q.trim() ? `Búsqueda: ${q.trim()}` : null,
        estado !== "TODOS" ? `Estado: ${estado}` : null,
      ]
        .filter(Boolean)
        .join(" | ") || "Sin filtros";

    const headers = [
      "N°",
      "Fecha registro",
      "Fecha confirmación",
      "Nombre completo",
      "DNI",
      "Cargo",
      "Estado",
      "Total selecciones",
      ...GROUP_LETTERS.map((letter) => `Grupo ${letter}`),
    ];

    const rows = registros.map((registro, index) => {
      const grupos = new Map(
        registro.grupos.map((grupo) => [
          grupo.grupo,
          grupo.paises.map((pais) => pais.nombre).join(" / ") || "-",
        ]),
      );

      return [
        String(index + 1),
        formatDateTimeLabel(registro.fechaRegistro),
        formatDateTimeLabel(registro.fechaConfirmacion),
        registro.participante.nombreCompleto,
        registro.participante.dni,
        registro.participante.cargo,
        registro.estado,
        `${registro.totalSelecciones}/24`,
        ...GROUP_LETTERS.map((letter) => grupos.get(letter) || "-"),
      ];
    });

    const headerHtml = headers
      .map((header) => `<th>${escapeHtml(header)}</th>`)
      .join("");

    const rowsHtml = rows
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
            th { background: #1f1f1f; color: #ffffff; font-weight: 700; }
            th, td { border: 1px solid #cfcfcf; padding: 8px; vertical-align: top; }
            .title { font-size: 18px; font-weight: 700; color: #111111; }
            .meta { color: #555555; font-size: 12px; }
          </style>
        </head>
        <body>
          <p class="title">Reporte de Registros - Polla COBPERU Fase Previa</p>
          <p class="meta">Generado: ${escapeHtml(generatedAt)}</p>
          <p class="meta">Filtros: ${escapeHtml(filtrosAplicados)}</p>
          <table>
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte_polla_cobperu_${getDateFileName()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.debug("[PollaCOBPERU] Reporte exportado correctamente", {
      total: registros.length,
      filtros: { q, estado },
    });
  }

  return (
    <main className="min-h-screen bg-[#f4f4f4] text-neutral-950">
      <header className="sticky top-0 z-30 border-t-4 border-red-600 bg-[#202020] text-white shadow-lg">
        <div className="pitch-lines pointer-events-none absolute inset-x-0 bottom-0 h-2 bg-green-800/80" />
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-44 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-lg shadow-red-700/20">
              <img
                alt="COBRANZAS PERÚ"
                className="h-full w-full object-cover"
                src="/logo-cobperu.png"
              />
            </div>
            <div>
              <p className="text-lg font-black leading-none tracking-wide md:text-xl">
                Reporte de Registros
              </p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-[0.25em] text-neutral-500">
                Polla COBPERU Fase Previa
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase text-neutral-950 shadow-sm">
              <ClipboardList size={14} />
              {totalParticipantesLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-black uppercase text-white shadow-sm">
              Fecha límite: {formatDateLabel(data?.evento?.fechaLimite)}
            </span>
            <button
              className="btn-secondary min-h-10"
              type="button"
              onClick={onBack}
            >
              <ArrowLeft size={18} />
              Volver al formulario
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                Registros creados
              </h1>
              <p className="mt-1 text-sm font-semibold text-neutral-500">
                Consulta los participantes registrados y revisa sus selecciones
                por grupo.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="btn-secondary min-h-11"
                type="button"
                onClick={() => cargarReporte()}
                disabled={loading}
              >
                {loading ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <RefreshCw size={18} />
                )}
                Actualizar
              </button>
              <button
                className="btn-primary min-h-11"
                type="button"
                onClick={exportarExcel}
                disabled={loading || registros.length === 0}
                title={
                  registros.length === 0
                    ? "No hay registros para exportar"
                    : "Exportar reporte a Excel"
                }
              >
                <Download size={18} />
                Exportar Excel
              </button>
            </div>
          </div>

          <form
            className="grid gap-3 md:grid-cols-[1fr_220px_auto]"
            onSubmit={handleSubmit}
          >
            <div className="input-shell">
              <input
                className="form-input pl-11"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Buscar por nombre, DNI o cargo"
              />
            </div>
            <div className="flex gap-2">
              <button
                className="btn-primary min-h-11 flex-1"
                type="submit"
                disabled={loading}
              >
                <Search size={18} />
                Buscar
              </button>
              <button
                className="btn-secondary min-h-11"
                type="button"
                onClick={limpiarFiltros}
                disabled={loading}
              >
                Limpiar
              </button>
            </div>
          </form>
        </div>

        {/* {resumen && (
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <SummaryCard
              icon={<Users size={24} />}
              label="Total registros"
              value={resumen.totalRegistros}
            />
            <SummaryCard
              icon={<CheckCircle2 size={24} />}
              label="Confirmados"
              value={resumen.confirmados}
            />
            <SummaryCard
              icon={<ClipboardList size={24} />}
              label="Borradores"
              value={resumen.borradores}
            />
            <SummaryCard
              icon={<Trophy size={24} />}
              label="Selecciones"
              value={resumen.totalSelecciones}
            />
          </div>
        )} */}

        {loading ? (
          <div className="grid min-h-72 place-items-center rounded-2xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <div>
              <LoaderCircle
                className="mx-auto mb-4 animate-spin text-red-600"
                size={44}
              />
              <p className="text-lg font-black text-neutral-950">
                Cargando reporte...
              </p>
              <p className="text-sm font-semibold text-neutral-500">
                Estamos consultando los registros creados.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="grid min-h-72 place-items-center rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
            <div>
              <AlertTriangle className="mx-auto mb-4 text-red-600" size={44} />
              <p className="text-lg font-black text-neutral-950">
                No se pudo cargar el reporte
              </p>
              <p className="mx-auto mt-1 max-w-xl text-sm font-semibold text-neutral-500">
                {error}
              </p>
              <button
                className="btn-primary mx-auto mt-6"
                type="button"
                onClick={() => cargarReporte()}
              >
                <RefreshCw size={18} />
                Reintentar
              </button>
            </div>
          </div>
        ) : registros.length === 0 ? (
          <div className="grid min-h-72 place-items-center rounded-2xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <div>
              <ClipboardList className="mx-auto mb-4 text-red-600" size={44} />
              <p className="text-lg font-black text-neutral-950">
                Aún no hay registros para mostrar
              </p>
              <p className="text-sm font-semibold text-neutral-500">
                Cuando los participantes confirmen sus pronósticos aparecerán en
                esta vista.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-245 w-full text-left">
                <thead className="bg-neutral-950 text-white">
                  <tr>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">
                      Participante
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">
                      Cargo
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider">
                      Selecciones
                    </th>
                    <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {registros.map((registro) => (
                    <tr
                      key={registro.idPronostico}
                      className="hover:bg-neutral-50"
                    >
                      <td className="px-4 py-4 text-sm font-bold text-neutral-600">
                        {formatDateTimeLabel(
                          registro.fechaConfirmacion || registro.fechaRegistro,
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-black text-neutral-950">
                          {registro.participante.nombreCompleto}
                        </p>
                        <p className="text-xs font-bold text-neutral-500">
                          DNI {registro.participante.dni}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-neutral-700">
                        {registro.participante.cargo}
                      </td>
                      <td className="px-4 py-4">
                        <EstadoBadge estado={registro.estado} />
                      </td>
                      <td className="px-4 py-4 text-sm font-black text-neutral-950">
                        {registro.totalSelecciones}/24
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          className="btn-secondary min-h-10"
                          type="button"
                          onClick={() => setSelectedRegistro(registro)}
                        >
                          <Eye size={17} />
                          Ver selección
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {selectedRegistro && (
        <DetalleRegistroModal
          registro={selectedRegistro}
          onClose={() => setSelectedRegistro(null)}
        />
      )}
    </main>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getDateFileName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}_${hour}-${minute}`;
}

// function SummaryCard({
//   icon,
//   label,
//   value,
// }: {
//   icon: ReactNode;
//   label: string;
//   value: number;
// }) {
//   return (
//     <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
//       <div className="mb-3 inline-grid h-11 w-11 place-items-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/20">
//         {icon}
//       </div>
//       <p className="text-3xl font-black text-neutral-950">{value}</p>
//       <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
//         {label}
//       </p>
//     </article>
//   );
// }

function EstadoBadge({ estado }: { estado: string }) {
  const tone =
    {
      CONFIRMADO: "border-green-200 bg-green-50 text-green-800",
      BORRADOR: "border-amber-200 bg-amber-50 text-amber-800",
      ANULADO: "border-red-200 bg-red-50 text-red-800",
    }[estado] || "border-neutral-200 bg-neutral-100 text-neutral-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${tone}`}
    >
      {estado}
    </span>
  );
}

function DetalleRegistroModal({
  registro,
  onClose,
}: {
  registro: ReporteRegistro;
  onClose: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detalle-title"
    >
      <div className="modal-panel">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-2xl">
              📋
            </span>
            <div>
              <h2 id="detalle-title" className="text-2xl font-black text-white">
                Detalle del registro
              </h2>
              <p className="text-sm font-semibold text-neutral-500">
                {registro.participante.nombreCompleto} · DNI{" "}
                {registro.participante.dni}
              </p>
            </div>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={24} />
          </button>
        </div>

        <div className="max-h-[calc(100vh-190px)] overflow-y-auto px-5 py-5 md:px-8">
          <section className="rounded-2xl border border-neutral-300 bg-neutral-100 p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-4">
              <ModalData label="Cargo" value={registro.participante.cargo} />
              <ModalData label="Estado" value={registro.estado} />
              <ModalData
                label="Selecciones"
                value={`${registro.totalSelecciones}/24`}
              />
              <ModalData
                label="Fecha"
                value={formatDateTimeLabel(
                  registro.fechaConfirmacion || registro.fechaRegistro,
                )}
              />
            </div>
          </section>

          <section className="mt-6">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-neutral-500">
              Clasificados elegidos por grupo
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {registro.grupos.map((grupo) => (
                <div
                  key={grupo.grupo}
                  className="rounded-xl border border-neutral-300 bg-neutral-100 p-4 shadow-sm"
                >
                  <span className="mb-3 inline-flex rounded-md bg-red-600 px-3 py-1 text-xs font-black text-white">
                    Grupo {grupo.grupo}
                  </span>
                  <div className="space-y-1.5">
                    {grupo.paises.map((pais) => (
                      <p
                        key={pais.idGrupoPais}
                        className="text-sm font-black text-neutral-950"
                      >
                        {pais.codigoIso && (
                          <span className="mr-1 uppercase text-neutral-500">
                            {pais.codigoIso}
                          </span>
                        )}
                        {pais.nombre}
                        {pais.clasificadoReal && (
                          <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black uppercase text-green-700">
                            Acertó
                          </span>
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="modal-actions">
          <button
            className="btn-primary flex-1"
            type="button"
            onClick={onClose}
          >
            Cerrar detalle
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalData({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
      <p className="mt-0.5 text-base font-black text-neutral-950">{value}</p>
    </div>
  );
}
