import { HttpErrorResponse } from '@angular/common/http';

/**
 * Textos con los que cada plataforma reporta una red caida o inaccesible.
 *
 * Chrome, Safari y el WebView de Android no coinciden: Android reporta el
 * fallo de DNS como `unable to resolve host "": No address associated with
 * hostname`, que no parece un error de red si no se conoce el texto.
 *
 * NINGUNO de estos textos debe llegar a la persona usuaria en crudo: son
 * tecnicismos que no ayudan a entender que fallo ni que hacer.
 */
const ERRORES_DE_RED =
  /failed to fetch|networkerror|network error|load failed|why did you load|err_connection|err_internet|err_empty|err_aborted|enotfound|econnrefused|econnreset|etimedout|null origin|http failure response|unable to resolve host|no address associated with hostname|unknownhost|net::err_|connection refused|connection reset|connection timed out|network request failed|socket hang up|cleartext|timed? ?out/i;

/** No hay red o el backend no es accesible. */
const FALLO_CONEXION =
  'No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.';

/** El backend respondio con error (5xx): nunca se muestra el detalle interno. */
const FALLO_SERVIDOR =
  'El servidor está teniendo problemas. Inténtalo de nuevo en unos minutos.';

/** Respaldo absoluto: no filtra detalles tecnicos. */
const FALLO_INESPERADO = 'Ocurrió un error inesperado. Inténtalo de nuevo.';

/**
 * Mensaje amigable por codigo HTTP. Solo se usa cuando el backend no manda
 * un mensaje propio (validaciones, permisos...), que siempre tiene prioridad.
 */
const POR_ESTADO: Record<number, string> = {
  400: 'Los datos enviados no son válidos. Revisa el formulario e inténtalo de nuevo.',
  401: 'Tu sesión ha expirado. Vuelve a iniciar sesión para continuar.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'No se encontró lo que buscabas. Puede que ya no esté disponible.',
  408: 'La petición tardó demasiado. Revisa tu conexión e inténtalo de nuevo.',
  413: 'Los datos o el archivo son demasiado grandes.',
  415: 'Ese tipo de archivo no está permitido.',
  429: 'Demasiadas peticiones. Espera unos segundos e inténtalo de nuevo.',
};

/** true si el texto suena a un fallo de red (red caida, CORS, DNS, timeout). */
function esFalloDeRed(texto: string): boolean {
  return ERRORES_DE_RED.test(texto);
}

/**
 * Extrae el mensaje que manda el backend (`{ statusCode, message }`).
 * `message` puede venir como arreglo cuando son errores de validacion.
 */
function mensajeDelBackend(error: HttpErrorResponse): string {
  const cuerpo = error.error as { message?: string | string[] } | null | undefined;
  const mensaje = cuerpo?.message;

  if (Array.isArray(mensaje)) {
    return mensaje
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim())
      .join(' · ');
  }

  if (typeof mensaje === 'string') {
    return mensaje.trim();
  }

  return '';
}

/**
 * Convierte cualquier error del HttpClient en un mensaje legible para la
 * persona usuaria.
 *
 * Orden de prioridad:
 *  1. Fallo de red -> texto amigable (nunca el tecnicismo del navegador).
 *  2. Error del servidor (5xx) -> texto amigable; el backend suele devolver
 *     tecnicismos (SQL, stack traces) que no le sirven a nadie.
 *  3. Mensaje propio del backend (validaciones, permisos) -> se muestra tal
 *     cual, porque esta escrito a proposit para la persona.
 *  4. Si no hay nada utilizable, el codigo HTTP con su texto amigable.
 */
export function mensajeDeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    // 1. Red caida: el status 0 cubre CORS roto, servidor apagado y DNS.
    if (error.status === 0 || esFalloDeRed(error.message)) {
      return FALLO_CONEXION;
    }

    // 2. 5xx: se ocultan los detalles internos del servidor.
    if (error.status >= 500) {
      return FALLO_SERVIDOR;
    }

    // 3. Mensaje propio del backend.
    const propio = mensajeDelBackend(error);

    if (propio) {
      // Por si acaso el backend reenvia un texto de red.
      return esFalloDeRed(propio) ? FALLO_CONEXION : propio;
    }

    // 4. Sin cuerpo utilizable: se usa el codigo.
    return POR_ESTADO[error.status] ?? `Ocurrió un error (código ${error.status}).`;
  }

  if (error instanceof Error) {
    // El WebView/Capacitor puede fallar sin llegar a ser HttpErrorResponse.
    return esFalloDeRed(error.message) ? FALLO_CONEXION : FALLO_INESPERADO;
  }

  return FALLO_INESPERADO;
}

/**
 * Reutiliza `mensajeDeError` para las pantallas que necesitan varios mensajes
 * a la vez (ej. el registro, que pinta uno por campo).
 */
export function mensajesDeError(error: unknown): string[] {
  if (error instanceof HttpErrorResponse) {
    const mensaje = mensajeDelBackend(error);
    if (mensaje) return mensaje.split(' · ');
  }

  return [mensajeDeError(error)];
}
