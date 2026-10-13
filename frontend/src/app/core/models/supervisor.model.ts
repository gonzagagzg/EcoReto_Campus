import type { EstadoEvaluacion } from './participacion.model';
import type { EstadoReto } from './reto.model';

/** Colas de trabajo que espera el Supervisor en su panel. */
export interface ColaSupervision {
  retosPendientesAprobacion: number;
  evidenciasPendientes: number;
  usuariosPendientesActivacion: number;
  ticketsSoportePendientes: number;
}

/** GET /gg/supervisor/panel */
export interface PanelSupervision extends ColaSupervision {
  retosPorEstado: { estadoReto: EstadoReto; total: number }[];
  participacionesPorEstado: { estado: EstadoEvaluacion; total: number }[];
}

/** Elemento de la cola de evidencias. `evidencia` es la ruta de la imagen. */
export interface EvidenciaPendiente {
  idParticipacion: number;
  idReto: number;
  idUsuario: number;
  nombreUsuario: string;
  nombreReto: string;
  evidencia: string;
  estadoParticipacion: EstadoEvaluacion;
  fechaEnvio: string | null;
  fechaRevision: string | null;
}
