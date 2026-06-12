import type {
  ApiResponse,
  CatalogoResponse,
  Grupo,
  Evento,
  PronosticoDniResponse,
  RegistrarPronosticoPayload,
} from "../types/polla";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function buildUrl(path: string): string {
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  let body: ApiResponse<T> | T;

  try {
    body = await response.json();
  } catch {
    throw new Error("No se recibió una respuesta válida del servidor.");
  }

  if (!response.ok) {
    const apiBody = body as ApiResponse<T>;
    const firstValidationMessage = apiBody.errors?.find((item) => item.message)?.message;
    throw new Error(firstValidationMessage || apiBody.message || "No se pudo completar la solicitud.");
  }

  return body as T;
}

export async function obtenerCatalogo(): Promise<{ evento: Evento | null; grupos: Grupo[] }> {
  const response = await requestJson<CatalogoResponse>("/polla/catalogo");

  return {
    evento: response.evento || response.data?.evento || null,
    grupos: response.grupos || response.data?.grupos || [],
  };
}

export async function consultarPronosticoPorDni(dni: string): Promise<ApiResponse<PronosticoDniResponse>> {
  return requestJson<ApiResponse<PronosticoDniResponse>>(`/polla/pronostico/${dni}`);
}

export async function registrarPronostico(payload: RegistrarPronosticoPayload): Promise<ApiResponse> {
  return requestJson<ApiResponse>("/polla/pronostico", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
