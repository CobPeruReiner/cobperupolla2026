import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit3,
  LoaderCircle,
  RefreshCw,
  Send,
  // ShieldCheck,
  Trophy,
  // UserRound,
  X,
} from "lucide-react";
import {
  consultarPronosticoPorDni,
  obtenerCatalogo,
  registrarPronostico,
} from "./services/pollaApi";
import type { Evento, Grupo, Pais, ParticipanteForm } from "./types/polla";
import { formatDateLabel, getTodayLabel, normalizeDni } from "./utils/format";
import "./index.css";

const EMPTY_PARTICIPANTE: ParticipanteForm = {
  nombreCompleto: "",
  dni: "",
  cargo: "",
};

type ToastType = "success" | "warning" | "error" | "info";

interface ToastState {
  type: ToastType;
  message: string;
}

interface FormErrors {
  nombreCompleto?: string;
  dni?: string;
  cargo?: string;
  grupos?: string;
}

export const App = () => {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [participante, setParticipante] =
    useState<ParticipanteForm>(EMPTY_PARTICIPANTE);
  const [selecciones, setSelecciones] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingDni, setCheckingDni] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    cargarCatalogo();
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(null), 4600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const totalRequired = grupos.length * 2;
  const totalSelected = useMemo(
    () =>
      Object.values(selecciones).reduce((total, ids) => total + ids.length, 0),
    [selecciones],
  );
  const progress = totalRequired
    ? Math.round((totalSelected / totalRequired) * 100)
    : 0;
  const incompleteGroups = grupos.filter(
    (grupo) => (selecciones[grupo.letra]?.length || 0) !== 2,
  );
  const isComplete = grupos.length > 0 && incompleteGroups.length === 0;
  const registroAbierto = evento?.registroAbierto !== false;

  async function cargarCatalogo() {
    try {
      setLoading(true);
      setCatalogError(null);
      const catalogo = await obtenerCatalogo();
      setEvento(catalogo.evento);
      setGrupos(catalogo.grupos);

      const initialSelections = catalogo.grupos.reduce<
        Record<string, number[]>
      >((acc, grupo) => {
        acc[grupo.letra] = [];
        return acc;
      }, {});

      setSelecciones(initialSelections);

      if (!catalogo.evento?.registroAbierto) {
        setToast({
          type: "warning",
          message:
            "La fecha límite ya venció. El formulario está disponible solo para consulta.",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cargar el catálogo.";
      setCatalogError(message);
      setToast({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }

  function showToast(type: ToastType, message: string) {
    setToast({ type, message });
  }

  function updateParticipante(field: keyof ParticipanteForm, value: string) {
    const cleanValue = field === "dni" ? normalizeDni(value) : value;

    setParticipante((current) => ({
      ...current,
      [field]: cleanValue,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  }

  async function handleDniBlur() {
    if (participante.dni.length < 8) return;

    try {
      setCheckingDni(true);
      const response = await consultarPronosticoPorDni(participante.dni);

      if (response.data?.confirmado) {
        showToast(
          "warning",
          "Este DNI ya tiene un pronóstico confirmado. Si necesitas corregirlo, comunícate con Sistemas.",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo validar el DNI.";
      console.warn("[PollaCOBPERU] Validación DNI:", message);
    } finally {
      setCheckingDni(false);
    }
  }

  function togglePais(grupo: Grupo, pais: Pais) {
    if (!registroAbierto) {
      showToast(
        "warning",
        "La fecha límite ya venció. No se pueden modificar pronósticos.",
      );
      return;
    }

    setSelecciones((current) => {
      const selected = current[grupo.letra] || [];
      const exists = selected.includes(pais.idGrupoPais);

      if (exists) {
        return {
          ...current,
          [grupo.letra]: selected.filter((id) => id !== pais.idGrupoPais),
        };
      }

      if (selected.length >= 2) {
        showToast(
          "warning",
          `En el Grupo ${grupo.letra} solo puedes marcar 2 países.`,
        );
        return current;
      }

      return {
        ...current,
        [grupo.letra]: [...selected, pais.idGrupoPais],
      };
    });

    setErrors((current) => ({ ...current, grupos: undefined }));
  }

  function validateForm(): boolean {
    const nextErrors: FormErrors = {};

    if (participante.nombreCompleto.trim().length < 3) {
      nextErrors.nombreCompleto =
        "Ingresa el nombre completo del participante.";
    }

    if (!/^\d{8,15}$/.test(participante.dni)) {
      nextErrors.dni =
        "El DNI debe contener solo números y tener entre 8 y 15 dígitos.";
    }

    if (!participante.cargo.trim()) {
      nextErrors.cargo = "Ingresa el cargo del participante.";
    }

    if (!isComplete) {
      nextErrors.grupos =
        "Completa todos los grupos. Debes seleccionar exactamente 2 países por grupo.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      showToast(
        "warning",
        "Revisa los campos pendientes antes de confirmar tu pronóstico.",
      );
      return false;
    }

    return true;
  }

  function openConfirmModal() {
    if (!registroAbierto) {
      showToast(
        "warning",
        "La fecha límite ya venció. Ya no se pueden registrar pronósticos.",
      );
      return;
    }

    if (!validateForm()) return;
    setShowConfirmModal(true);
  }

  async function submitPronostico() {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const payload = {
        participante: {
          nombreCompleto: participante.nombreCompleto.trim(),
          dni: participante.dni.trim(),
          cargo: participante.cargo.trim(),
        },
        selecciones: grupos.map((grupo) => ({
          grupo: grupo.letra,
          paises: selecciones[grupo.letra] || [],
        })),
      };

      console.debug("[PollaCOBPERU] Payload a enviar:", payload);

      const response = await registrarPronostico(payload);
      setShowConfirmModal(false);
      setSuccessMessage(
        response.message ||
          "¡Listo! Tu pronóstico fue registrado correctamente.",
      );
      showToast(
        "success",
        response.message || "Pronóstico registrado correctamente.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo registrar el pronóstico.";
      console.error("[PollaCOBPERU] Error al registrar pronóstico:", error);
      showToast("error", message);
    } finally {
      setSubmitting(false);
    }
  }

  function getSelectedCountriesByGroup(grupo: Grupo) {
    const ids = selecciones[grupo.letra] || [];
    return grupo.paises.filter((pais) => ids.includes(pais.idGrupoPais));
  }

  function resetForm() {
    setParticipante(EMPTY_PARTICIPANTE);
    setSelecciones(
      grupos.reduce<Record<string, number[]>>((acc, grupo) => {
        acc[grupo.letra] = [];
        return acc;
      }, {}),
    );
    setSuccessMessage(null);
    setErrors({});
    showToast(
      "info",
      "Formulario limpio. Puedes registrar un nuevo pronóstico.",
    );
  }

  if (successMessage) {
    return (
      <main className="min-h-screen bg-[#f4f4f4] text-neutral-950">
        <Header
          evento={evento}
          totalSelected={totalSelected}
          totalRequired={totalRequired}
          progress={progress}
        />
        <section className="mx-auto flex min-h-[calc(100vh-92px)] max-w-4xl items-center justify-center px-4 py-10">
          <div className="w-full rounded-[28px] border border-neutral-200 bg-white p-8 text-center shadow-xl md:p-12">
            <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/20">
              <Trophy size={42} />
            </div>
            <p className="mb-2 text-sm font-black uppercase tracking-[0.3em] text-red-600">
              Pronóstico confirmado
            </p>
            <h1 className="mb-3 text-3xl font-black text-neutral-950 md:text-4xl">
              ¡Registro completado!
            </h1>
            <p className="mx-auto mb-7 max-w-2xl text-base font-medium text-neutral-600">
              {successMessage}
            </p>
            <div className="mx-auto mb-8 max-w-md rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-left">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
                Participante
              </p>
              <p className="mt-2 text-lg font-black text-neutral-950">
                {participante.nombreCompleto}
              </p>
              <p className="text-sm font-bold text-neutral-500">
                DNI {participante.dni} · {participante.cargo}
              </p>
            </div>
            {/* <button
              className="btn-primary mx-auto hidden"
              type="button"
              onClick={resetForm}
            >
              <RefreshCw size={18} />
              Registrar otro participante
            </button> */}
          </div>
        </section>
        <Toast toast={toast} onClose={() => setToast(null)} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f4f4] pb-32 text-neutral-950">
      <Header
        evento={evento}
        totalSelected={totalSelected}
        totalRequired={totalRequired}
        progress={progress}
      />

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <ParticipantSection
          participante={participante}
          errors={errors}
          checkingDni={checkingDni}
          onChange={updateParticipante}
          onDniBlur={handleDniBlur}
        />

        <section className="mt-7">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex gap-3">
              <div className="step-badge">2</div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-neutral-950">
                  Selección de Clasificados por Grupo
                </h2>
                <p className="text-sm font-medium text-neutral-500">
                  Elige exactamente 2 países por grupo — Mundial FIFA 2026
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-neutral-500">
              <LegendDot className="bg-red-600" label="Seleccionado" />
              <LegendDot className="bg-amber-500" label="Incompleto" />
              <LegendDot className="bg-neutral-200" label="Bloqueado" />
            </div>
          </div>

          {loading ? (
            <LoadingState />
          ) : catalogError ? (
            <ErrorState message={catalogError} onRetry={cargarCatalogo} />
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {grupos.map((grupo) => (
                  <GroupCard
                    key={grupo.idGrupo}
                    grupo={grupo}
                    selectedIds={selecciones[grupo.letra] || []}
                    disabled={!registroAbierto}
                    onToggle={togglePais}
                  />
                ))}
              </div>

              {errors.grupos ? (
                <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">
                  <AlertTriangle className="mr-2 inline-block" size={18} />
                  {errors.grupos}
                </div>
              ) : incompleteGroups.length > 0 ? (
                <div className="mt-5 rounded-2xl border border-amber-300 bg-white px-5 py-4 text-sm text-neutral-600 shadow-sm">
                  <strong className="text-neutral-950">
                    Grupos incompletos:
                  </strong>{" "}
                  {incompleteGroups
                    .map((grupo) => `Grupo ${grupo.letra}`)
                    .join(", ")}{" "}
                  tienen menos de 2 selecciones. Completa todos los grupos para
                  habilitar el envío.
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-bold text-green-800">
                  <CheckCircle2 className="mr-2 inline-block" size={18} />
                  Todos los grupos están completos. Ya puedes confirmar tu
                  pronóstico.
                </div>
              )}
            </>
          )}
        </section>
      </section>

      <ProgressBar
        totalSelected={totalSelected}
        totalRequired={totalRequired}
        progress={progress}
        disabled={!isComplete || submitting || !registroAbierto}
        submitting={submitting}
        onConfirm={openConfirmModal}
      />

      {showConfirmModal && (
        <ConfirmationModal
          participante={participante}
          grupos={grupos}
          selectedByGroup={selecciones}
          submitting={submitting}
          onEdit={() => setShowConfirmModal(false)}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={submitPronostico}
          getSelectedCountriesByGroup={getSelectedCountriesByGroup}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  );
};

function Header({
  evento,
  totalSelected,
  totalRequired,
  progress,
}: {
  evento: Evento | null;
  totalSelected: number;
  totalRequired: number;
  progress: number;
}) {
  return (
    <header className="sticky top-0 z-30 border-t-4 border-red-600 bg-[#202020] text-white shadow-lg">
      <div className="pitch-lines pointer-events-none absolute inset-x-0 bottom-0 h-2 bg-green-800/80" />
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 md:grid-cols-[1fr_auto_1fr] md:items-center md:px-6 lg:px-8">
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
              COBRANZAS PERÚ
            </p>
            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.25em] text-neutral-500">
              Concurso interno de pronósticos
            </p>
          </div>
        </div>

        <div className="text-left md:text-center">
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">
            Polla COBPERU Fase Previa
          </h1>
          <p className="text-sm font-semibold text-neutral-500">
            Marca tus 2 clasificados por grupo — Mundial 2026
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
          <HeaderPill
            tone="red"
            icon={<CalendarDays size={14} />}
            label={`Fecha límite: ${formatDateLabel(evento?.fechaLimite)}`}
          />
          <HeaderPill tone="white" label={`Hoy: ${getTodayLabel()}`} />
          <HeaderPill
            tone="green"
            label={`${totalSelected}/${totalRequired || 24} sel.`}
          />
          <span className="sr-only">Progreso {progress}%</span>
        </div>
      </div>
    </header>
  );
}

function HeaderPill({
  label,
  tone,
  icon,
}: {
  label: string;
  tone: "red" | "white" | "green";
  icon?: React.ReactNode;
}) {
  const toneClass = {
    red: "bg-red-600 text-white",
    white: "bg-white text-neutral-950",
    green: "bg-green-700 text-white",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase shadow-sm ${toneClass}`}
    >
      {icon}
      {label}
    </span>
  );
}

function ParticipantSection({
  participante,
  errors,
  checkingDni,
  onChange,
  onDniBlur,
}: {
  participante: ParticipanteForm;
  errors: FormErrors;
  checkingDni: boolean;
  onChange: (field: keyof ParticipanteForm, value: string) => void;
  onDniBlur: () => void;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex gap-3">
        <div className="step-badge">1</div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-neutral-950">
            Datos del Participante
          </h2>
          <p className="text-sm font-medium text-neutral-500">
            Completa tu información antes de continuar
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Nombre completo" required error={errors.nombreCompleto}>
          <div className="input-shell">
            <input
              className="form-input input-with-icon"
              value={participante.nombreCompleto}
              onChange={(event) =>
                onChange("nombreCompleto", event.target.value)
              }
              placeholder="Ingresa tu nombre completo"
              autoComplete="name"
            />
          </div>
        </Field>

        <Field label="DNI" required error={errors.dni}>
          <div className="input-shell">
            <input
              className="form-input input-with-icon input-with-action"
              value={participante.dni}
              onChange={(event) => onChange("dni", event.target.value)}
              onBlur={onDniBlur}
              placeholder="Solo números"
              inputMode="numeric"
              autoComplete="off"
            />
            {checkingDni && (
              <LoaderCircle
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-neutral-400"
                size={18}
              />
            )}
          </div>
        </Field>

        <Field label="Cargo" required error={errors.cargo}>
          <div className="input-shell">
            <input
              className="form-input input-with-icon"
              value={participante.cargo}
              onChange={(event) => onChange("cargo", event.target.value)}
              placeholder="Ingresa tu cargo"
              autoComplete="organization-title"
            />
          </div>
        </Field>
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-neutral-800">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 block text-xs font-bold text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

function GroupCard({
  grupo,
  selectedIds,
  disabled,
  onToggle,
}: {
  grupo: Grupo;
  selectedIds: number[];
  disabled: boolean;
  onToggle: (grupo: Grupo, pais: Pais) => void;
}) {
  const complete = selectedIds.length === 2;
  const isLocked = selectedIds.length >= 2;

  return (
    <article
      className={`group-card ${complete ? "group-card-complete" : "group-card-incomplete"}`}
    >
      <div
        className={`group-card-header ${complete ? "bg-red-600" : "bg-neutral-900"}`}
      >
        <h3 className="text-xl font-black text-white">Grupo {grupo.letra}</h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${complete ? "bg-white text-red-600" : "bg-amber-500 text-white"}`}
        >
          {selectedIds.length}/2 sel.
        </span>
      </div>

      <div className="space-y-2 p-3">
        {grupo.paises.map((pais) => {
          const selected = selectedIds.includes(pais.idGrupoPais);
          const blocked = disabled || (!selected && isLocked);

          return (
            <button
              key={pais.idGrupoPais}
              type="button"
              className={`country-option ${selected ? "country-selected" : "country-normal"} ${blocked ? "country-blocked" : ""}`}
              onClick={() => onToggle(grupo, pais)}
              disabled={disabled || (!selected && isLocked)}
              aria-pressed={selected}
            >
              <span className="flex min-w-0 items-center gap-2">
                {pais.codigoIso && (
                  <span className="w-8 shrink-0 text-left text-xs font-black uppercase text-current/75">
                    {pais.codigoIso}
                  </span>
                )}
                <span className="truncate">{pais.nombre}</span>
              </span>
              {selected && <CheckCircle2 className="shrink-0" size={18} />}
            </button>
          );
        })}
      </div>
    </article>
  );
}

function ProgressBar({
  totalSelected,
  totalRequired,
  progress,
  disabled,
  submitting,
  onConfirm,
}: {
  totalSelected: number;
  totalRequired: number;
  progress: number;
  disabled: boolean;
  submitting: boolean;
  onConfirm: () => void;
}) {
  return (
    <section className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-700 bg-neutral-950/95 px-4 py-4 text-white shadow-[0_-10px_30px_rgba(0,0,0,0.25)] backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-4">
            <p className="text-sm font-black">Progreso total</p>
            <p className="text-sm font-black text-red-500">
              {totalSelected}/{totalRequired || 24} selecciones
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-red-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs font-semibold text-neutral-500">
            Faltan {Math.max((totalRequired || 24) - totalSelected, 0)}{" "}
            selecciones para completar todos los grupos
          </p>
        </div>
        <button
          className="btn-primary min-w-full md:min-w-64"
          disabled={disabled}
          type="button"
          onClick={onConfirm}
        >
          {submitting ? (
            <LoaderCircle className="animate-spin" size={19} />
          ) : (
            <Send size={19} />
          )}
          {submitting ? "Enviando..." : "Confirmar pronóstico"}
        </button>
      </div>
    </section>
  );
}

function ConfirmationModal({
  participante,
  grupos,
  selectedByGroup,
  submitting,
  onEdit,
  onClose,
  onConfirm,
  getSelectedCountriesByGroup,
}: {
  participante: ParticipanteForm;
  grupos: Grupo[];
  selectedByGroup: Record<string, number[]>;
  submitting: boolean;
  onEdit: () => void;
  onClose: () => void;
  onConfirm: () => void;
  getSelectedCountriesByGroup: (grupo: Grupo) => Pais[];
}) {
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="modal-panel">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-2xl">
              ⚽
            </span>
            <div>
              <h2 id="confirm-title" className="text-2xl font-black text-white">
                Confirmar Pronóstico
              </h2>
              <p className="text-sm font-semibold text-neutral-500">
                Revisa tu selección antes de enviar
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
            <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-neutral-500">
              Datos del participante
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <ModalData
                label="Nombre completo"
                value={participante.nombreCompleto}
              />
              <ModalData label="DNI" value={participante.dni} />
              <ModalData label="Cargo" value={participante.cargo} />
            </div>
          </section>

          <section className="mt-6">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-neutral-500">
              Tus clasificados por grupo
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {grupos.map((grupo) => (
                <div
                  key={grupo.idGrupo}
                  className="rounded-xl border border-neutral-300 bg-neutral-100 p-4 shadow-sm"
                >
                  <span className="mb-3 inline-flex rounded-md bg-red-600 px-3 py-1 text-xs font-black text-white">
                    Grupo {grupo.letra}
                  </span>
                  <div className="space-y-1.5">
                    {getSelectedCountriesByGroup(grupo).map((pais) => (
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
                      </p>
                    ))}
                    {(selectedByGroup[grupo.letra]?.length || 0) === 0 && (
                      <p className="text-sm font-bold text-neutral-500">
                        Sin selección
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="modal-actions">
          <button
            className="btn-secondary"
            type="button"
            onClick={onEdit}
            disabled={submitting}
          >
            <Edit3 size={18} />
            Editar selección
          </button>
          <button
            className="btn-primary flex-1"
            type="button"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <LoaderCircle className="animate-spin" size={18} />
            ) : (
              <span className="text-xl">⚽</span>
            )}
            {submitting ? "Enviando..." : "Confirmar y Enviar"}
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

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="grid min-h-72 place-items-center rounded-2xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
      <div>
        <LoaderCircle
          className="mx-auto mb-4 animate-spin text-red-600"
          size={44}
        />
        <p className="text-lg font-black text-neutral-950">
          Cargando grupos y países...
        </p>
        <p className="text-sm font-semibold text-neutral-500">
          Estamos preparando el formulario de pronóstico.
        </p>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-72 place-items-center rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
      <div>
        <AlertTriangle className="mx-auto mb-4 text-red-600" size={44} />
        <p className="text-lg font-black text-neutral-950">
          No se pudo cargar el formulario
        </p>
        <p className="mx-auto mt-1 max-w-xl text-sm font-semibold text-neutral-500">
          {message}
        </p>
        <button
          className="btn-primary mx-auto mt-6"
          type="button"
          onClick={onRetry}
        >
          <RefreshCw size={18} />
          Reintentar
        </button>
      </div>
    </div>
  );
}

function Toast({
  toast,
  onClose,
}: {
  toast: ToastState | null;
  onClose: () => void;
}) {
  if (!toast) return null;

  const toneClass = {
    success: "border-green-200 bg-green-50 text-green-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-red-200 bg-red-50 text-red-800",
    info: "border-neutral-200 bg-white text-neutral-800",
  }[toast.type];

  const icon = {
    success: <CheckCircle2 size={20} />,
    warning: <AlertTriangle size={20} />,
    error: <AlertTriangle size={20} />,
    info: <ClipboardList size={20} />,
  }[toast.type];

  return (
    <div
      className={`fixed right-4 top-24 z-50 flex max-w-md items-start gap-3 rounded-2xl border p-4 shadow-xl ${toneClass}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p className="text-sm font-bold leading-5">{toast.message}</p>
      <button
        className="ml-auto shrink-0 opacity-70 hover:opacity-100"
        type="button"
        onClick={onClose}
        aria-label="Cerrar alerta"
      >
        <X size={18} />
      </button>
    </div>
  );
}

export default App;
