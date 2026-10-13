/**
 * Baja lógica del catálogo: mismos valores que el estado de usuario, con el
 * nombre corto en minusculas que usa el backend.
 */
export enum EstadoPremio {
  Activo = 'activo',
  Desactivo = 'desactivo',
}

/** Catalogo de premios canjeables con los puntos acumulados. */
export interface Premio {
  idPremio: number;
  nombrePremio: string;
  descripcionPremio: string;
  imagenPremio: string | null;
  puntosPremio: number;
  estado: EstadoPremio;
}

/** Movimiento de canje registrado en el historial. */
export interface HistorialPremio {
  idHistorialPremio: number;
  idPremio: number;
  idUsuario: number;
  fechaCanje: string;
  estadoCanjePremio: string;
  fechaReclamo: string | null;
  observacionCanje: string | null;
  premio?: Premio;
}

/**
 * POST /gg/premios (solo staff). No admite imagen: el backend no expone una
 * ruta de subida para premios, el campo imagenPremio queda en null.
 */
export interface CrearPremio {
  nombrePremio: string;
  descripcionPremio: string;
  puntosPremio: number;
  /** URL o ruta de la imagen del premio. */
  imagenPremio?: string;
}

export interface ActualizarPremio {
  nombrePremio?: string;
  descripcionPremio?: string;
  puntosPremio?: number;
  /** Sólo Administrador: da de baja o restaura el premio del catálogo. */
  estado?: EstadoPremio;
  /** URL o ruta de la imagen del premio. */
  imagenPremio?: string;
}

/** POST /gg/premios/canjear */
export interface CanjearPremio {
  idPremio: number;
}

export type ConsultarPremios = {
  pagina?: number;
  limite?: number;
  busqueda?: string;
  puntosMaximos?: number;
};
