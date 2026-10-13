export enum EstadoEvaluacion {
  Enviado = 'Enviado',
  Aprobado = 'Aprobado',
  Negado = 'Negado',
  Bloqueado = 'Bloqueado',
}

/** Registro de inscripcion de un usuario a un reto. */
export interface RetoParticipante {
  idRetosParticipantes: number;
  idReto: number;
  idUsuario: number;
  numParticipacion: number;
}

/**
 * POST /gg/participaciones (multipart). El archivo va con el nombre
 * 'evidencia', el cuerpo solo lleva idReto y comentario opcional.
 */
export interface RegistrarEvidencia {
  idReto: number;
  comentario?: string;
  evidencia?: File;
}

/** Una evidencia subida y su estado de evaluacion. */
export interface Participacion {
  idParticipacion: number;
  idRetosParticipantes: number;
  idUsuario: number;
  imagenEvidencia: string;
  estadoParticipacion: EstadoEvaluacion;
  idUsuarioRevisor: number | null;
  observacionRevision: string | null;
  respuestaEvidencia: string | null;
  fechaRevision: string | null;
  diasCumplidos: number | null;
}

/**
 * POST /gg/supervisor/evidencias/:id/revision (solo staff). 'Enviado' no es
 * valor valido. Al aprobar o negar se borra la carpeta de evidencia en el
 * servidor; al bloquear se conserva para que el usuario corrija.
 */
export interface RevisarEvidencia {
  estadoParticipacion: EstadoEvaluacion;
  observacionRevision?: string;
  respuestaEvidencia?: string;
  diasCumplidos?: number;
}

export interface ParticipacionConDetalle {
  idParticipacion: number;
  idRetosParticipantes: number;
  idUsuario: number;
  imagenEvidencia: string;
  estadoParticipacion: EstadoEvaluacion;
  idUsuarioRevisor: number | null;
  aliasRevisor: string | null;
  observacionRevision: string | null;
  respuestaEvidencia: string | null;
  fechaRevision: string | null;
  nombreReto: string;
}

export type ConsultarParticipaciones = {
  pagina?: number;
  limite?: number;
  estadoParticipacion?: EstadoEvaluacion;
  idUsuario?: number;
  idRetosParticipantes?: number;
  busqueda?: string;
};
