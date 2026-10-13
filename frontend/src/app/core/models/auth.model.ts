/** POST /gg/auth/login */
export interface Login {
  correo: string;
  contrasena: string;
}

/**
 * POST /gg/auth/registro. El correo debe ser institucional (ver
 * CORREO_DOMINIOS_INSTITUCIONALES del backend); si la lista esta vacia la
 * restriccion esta desactivada.
 */
export interface Registro {
  nombre: string;
  apellido: string;
  correo: string;
  alias: string;
  cedula: string;
  contrasena: string;
  carrera?: string;
  nivelCarrera?: string;
  centroEstudios?: string;
  idsGustos?: number[];
}

/** POST /gg/auth/refresh */
export interface RefrescarToken {
  refreshToken: string;
}

/** Respuesta de login y refresh: el backend no devuelve la password. */
export interface Sesion {
  accessToken: string;
  refreshToken: string;
  alias: string;
}

/** Respuesta de registro: solo el alias, la cuenta queda pendiente. */
export interface RegistroExitoso {
  alias: string;
}

/** Decodificacion del payload del JWT (sin verificar la firma). */
export interface PayloadToken {
  sub: number;
  correo: string;
  alias: string;
  rol: string;
  tipo: 'access' | 'refresh';
  /** Segundos desde 1970. Solo lo trae el access token. */
  exp?: number;
}
