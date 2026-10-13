/**
 * Envoltorio que usan todos los listados del backend:
 * RetosService.listar, UsuariosService.listar, etc. devuelven { items, total }.
 */
export interface ListadoPaginado<T> {
  items: T[];
  total: number;
}

/** Respuesta de GET /gg: comprobacion de conexion a la base de datos. */
export interface EstadoConexion {
  conectado: boolean;
  mensaje: string;
  /** true si la IA esta activada y Ollama respondio. */
  ia: boolean;
}

/** Respuesta de los endpoints de baja. */
export interface ResultadoEliminacion {
  eliminado: boolean;
}

/**
 * Forma de los errores que devuelve el filtro global del backend
 * (src/common/filters/all-exceptions.filter.ts). En validaciones message
 * viene como arreglo, en errores simples como cadena.
 */
export interface ErrorAPI {
  statusCode: number;
  message: string | string[];
  error?: string;
}
