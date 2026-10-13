import type { EstadoEvaluacion } from './participacion.model';
import type { EstadoReto } from './reto.model';
import type { EstadoUsuario, Rol } from './usuario.model';

export interface ConteoPorEstado<T> {
  estado: T;
  total: number;
}

/**
 * GET /gg/admin/resumen (solo Administrador). 
 */
export interface ResumenAdmin {
  totalUsuarios: number;
  usuariosPorEstado: ConteoPorEstado<EstadoUsuario>[];
  usuariosPorRol: { rol: Rol; total: number }[];
  totalRetos: number;
  retosPorEstado: { estadoReto: EstadoReto; total: number }[];
  totalParticipaciones: number;
  participacionesPorEstado: ConteoPorEstado<EstadoEvaluacion>[];
  totalPremios: number;
  totalTickets: number;
  soportePorEstado: ConteoPorEstado<EstadoEvaluacion>[];
  puntosEnCirculacion: number;
}

/** PUT/PATCH sobre un usuario ajeno: el Administrador si puede cambiarlo todo. */
export interface CambiarEstadoUsuario {
  estado: EstadoUsuario;
}

export interface CambiarRolUsuario {
  rol: Rol;
}

export interface ActualizarUsuario {
  nombre?: string;
  apellido?: string;
  alias?: string;
  correo?: string;
  cedula?: string;
  carrera?: string;
  nivelCarrera?: string;
  centroEstudios?: string;
  contrasena?: string;
  puntos?: number;
  historialPuntos?: number;
  retosCumplidos?: number;
  nivel?: number;
  estado?: string;
  rol?: string;
}

export interface HistorialPremioAdmin {
  idHistorialPremio: number;
  idPremio: number;
  nombrePremio: string;
  idUsuario: number;
  nombreUsuario: string;
  aliasUsuario: string;
  fechaCanje: string;
  estadoCanjePremio: string;
  fechaReclamo: string | null;
  observacionCanje: string | null;
}

export enum EstadoCanjePremio {
  Pendiente = 'pendiente',
  ListoParaReclamar = 'listo para reclamar',
  Reclamado = 'reclamado',
  Negado = 'negado',
  Bloqueado = 'bloqueado',
}

/**
 * GET /gg/admin/participaciones: una fila del historial con los nombres ya
 * resueltos, para que la tabla no muestre ids crudos del usuario ni del reto.
 */
export interface ParticipacionHistorial {
  idParticipacion: number;
  idRetosParticipantes: number;
  idReto: number | null;
  idUsuario: number;
  nombreUsuario: string;
  nombreReto: string;
  imagenEvidencia: string;
  estadoParticipacion: EstadoEvaluacion;
  idUsuarioRevisor: number | null;
  aliasRevisor: string | null;
  observacionRevision: string | null;
  respuestaEvidencia: string | null;
  fechaRevision: string | null;
  fechaCreacion: string;
  diasCumplidos: number | null;
}
