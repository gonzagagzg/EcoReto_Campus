import type { EstadoEvaluacion } from './participacion.model';

/** Solicitud de soporte enviada al Administrador. */
export interface Soporte {
  idSoporte: number;
  idUsuario: number;
  /** Sólo lo traen los listados, nunca la respuesta de `crear`. */
  nombreUsuario?: string;
  /** Alias del administrador que respondió el ticket. Solo en los listados. */
  aliasRevisor?: string | null;
  idRevisorS?: number | null;
  nombreSoporte: string;
  detalleSoporte: string;
  /** Respuesta escrita por el administrador al atender el ticket. */
  respuestaSoporte?: string | null;
  imagenesSoporte: string | null;
  fechaCreacion: string;
  fechaAtencion: string | null;
  estadoSoporte: EstadoEvaluacion;
}

/** POST /gg/soporte */
export interface CrearSoporte {
  nombreSoporte: string;
  detalleSoporte: string;
  imagen?: File;
}

/**
 * POST /gg/soporte/:id/responder. Solo el Administrador puede responderlo y el
 * ticket ya respondido no se puede reabrir. La respuesta escrita se guarda en
 * `respuestaSoporte`.
 */
export interface ResponderSoporte {
  estadoSoporte: EstadoEvaluacion;
  respuestaSoporte?: string;
}

export type ConsultarSoporte = {
  pagina?: number;
  limite?: number;
  estadoSoporte?: EstadoEvaluacion;
  idUsuario?: number;
};
