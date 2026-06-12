export interface Evento {
  idEvento: number;
  nombre: string;
  descripcion?: string | null;
  fechaInicio?: string | null;
  fechaLimite: string;
  fechaServidor?: string | null;
  registroAbierto?: boolean;
}

export interface Pais {
  idGrupoPais: number;
  idPais: number;
  nombre: string;
  codigoIso?: string | null;
  posicion?: number;
}

export interface Grupo {
  idGrupo: number;
  letra: string;
  nombre: string;
  orden?: number;
  paises: Pais[];
}

export interface CatalogoResponse {
  ok: boolean;
  message: string;
  evento: Evento | null;
  grupos: Grupo[];
  data?: {
    evento: Evento | null;
    grupos: Grupo[];
    totalGrupos?: number;
    totalSeleccionesEsperadas?: number;
  };
  meta?: {
    totalGrupos?: number;
    totalSeleccionesEsperadas?: number;
  };
}

export interface ParticipanteForm {
  nombreCompleto: string;
  dni: string;
  cargo: string;
}

export interface SeleccionPayload {
  grupo: string;
  paises: number[];
}

export interface RegistrarPronosticoPayload {
  participante: ParticipanteForm;
  selecciones: SeleccionPayload[];
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  message: string;
  code?: string;
  data?: T;
  details?: unknown;
  errors?: Array<{
    message?: string;
    path?: Array<string | number>;
  }>;
}

export interface PronosticoDniResponse {
  existe: boolean;
  confirmado: boolean;
  participante: ParticipanteForm | null;
  pronostico: unknown | null;
  selecciones: unknown[];
}


export interface ReportePais {
  idGrupoPais: number;
  idPais?: number | null;
  nombre: string;
  codigoIso?: string | null;
  clasificadoReal: boolean;
}

export interface ReporteGrupo {
  grupo: string;
  nombre: string;
  orden?: number | null;
  paises: ReportePais[];
}

export interface ReporteRegistro {
  idPronostico: number;
  estado: "BORRADOR" | "CONFIRMADO" | "ANULADO" | string;
  fechaRegistro?: string | null;
  fechaConfirmacion?: string | null;
  fechaActualizacion?: string | null;
  participante: {
    idParticipante: number;
    nombreCompleto: string;
    dni: string;
    cargo: string;
  };
  totalSelecciones: number;
  puntaje: number;
  grupos: ReporteGrupo[];
}

export interface ReporteRegistrosData {
  evento: Evento | null;
  resumen: {
    totalRegistros: number;
    confirmados: number;
    borradores: number;
    anulados: number;
    totalSelecciones: number;
  };
  registros: ReporteRegistro[];
  filtros?: {
    q?: string;
    estado?: string;
  };
}
