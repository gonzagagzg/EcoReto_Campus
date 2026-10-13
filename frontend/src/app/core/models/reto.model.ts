/** Dificultad calculada en el servidor a partir de los dias del reto. */
export enum Dificultad {
  Facil = 'Fácil',
  Medio = 'Medio',
  Dificil = 'Difícil',
}

export enum EstadoReto {
  PendienteAprobacion = 'Pendiente_Aprobacion',
  Activo = 'Activo',
  Finalizado = 'Finalizado',
  Bloqueado = 'Bloqueado',
  /** Rechazado por el staff: no aparece en el feed del inicio. */
  Negado = 'Negado',
  /** Baja lógica: quitado del catálogo sin borrar sus participaciones. */
  Desactivado = 'Desactivado',
}

export interface Reto {
  idReto: number;
  idUsuarioCreador: number;
  /** Alias del usuario que creo el reto, cuando el backend lo resuelve. */
  creadorNombre?: string;
  nombreReto: string;
  imagenReto: string | null;
  descripcionReto: string;
  categoria: string;
  fechaCreacion: string;
  fechaLimite: string;
  dificultad: Dificultad;
  puntosCompletado: number;
  puntosParticipar: number;
  estadoReto: EstadoReto;
}

/**
 * POST /gg/retos: el cliente solo envia estos cuatro campos. La dificultad y los
 * puntos los calcula el backend con la fecha de creacion.
 */
export interface CrearReto {
  nombreReto: string;
  descripcionReto: string;
  categoria: string;
  fechaLimite: string;
  imagen?: File;
}

/** PUT /gg/retos/:id: actualizacion parcial. */
export interface ActualizarReto {
  nombreReto?: string;
  descripcionReto?: string;
  categoria?: string;
  fechaLimite?: string;
  imagen?: File;
}

/** GET /gg/retos: los flags restringidos solo los puede usar el staff. */
export type ConsultarRetos = {
  pagina?: number;
  limite?: number;
  estadoReto?: EstadoReto;
  dificultad?: Dificultad;
  categoria?: string;
  idUsuarioCreador?: number;
  busqueda?: string;
  todosEstados?: boolean;
  incluirVencidos?: boolean;
};

/**
 * POST /gg/supervisor/retos/:id/decision (solo staff). El reto solo puede
 * aprobarse, bloquearse o finalizarse: nunca vuelve a Pendiente_Aprobacion y
 * no se finaliza uno que todavia no fue aprobado.
 */
export interface DecisionReto {
  estadoReto: EstadoReto;
}

/** Filtro unico de las colas del panel de supervision. */
export type SupervisionQuery = {
  limite?: number;
};

export interface RetoParticipacionActual {
  idRetosParticipantes: number;
  idReto: number;
  nombreReto: string;
  imagenReto: string | null;
  descripcionReto: string;
  categoria: string;
  fechaLimite: string;
  dificultad: Dificultad;
  puntosCompletado: number;
  puntosParticipar: number;
  estadoReto: EstadoReto;
}
