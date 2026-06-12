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
