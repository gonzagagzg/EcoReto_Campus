import type { DeepPartial } from 'typeorm';
import type { Dificultad, EstadoReto, Reto } from '../entities/reto.entity';
import type { RetoParticipante } from '../entities/reto_participante.entity';

export const RETO_DAO = 'RETO_DAO';

export interface FiltrosReto {
  estadoReto?: EstadoReto;
  dificultad?: Dificultad;
  categoria?: string;
  idUsuarioCreador?: number;
  busqueda?: string;
  soloVisibles?: boolean;
  incluirVencidos?: boolean;
  skip?: number;
  take?: number;
}

export interface RetoDaoInterface {
  crear(datos: DeepPartial<Reto>): Promise<Reto>;
  buscarPorId(idReto: number): Promise<Reto | null>;
  listar(filtros: FiltrosReto): Promise<{ items: Reto[]; total: number }>;
  actualizar(idReto: number, datos: DeepPartial<Reto>): Promise<Reto>;
  cambiarEstado(idReto: number, estadoReto: EstadoReto): Promise<Reto>;
  eliminar(idReto: number): Promise<boolean>;
  registrarParticipante(idReto: number, idUsuario: number): Promise<RetoParticipante>;
  existeParticipante(idReto: number, idUsuario: number): Promise<RetoParticipante | null>;
  obtenerParticipantes(idReto: number): Promise<RetoParticipante[]>;
  contarParticipantes(idReto: number): Promise<number>;
  contarPorEstado(): Promise<{ estadoReto: EstadoReto; total: number }[]>;
  finalizarVencidos(fecha: Date): Promise<number>;
  listarIdsVencidos(fecha: Date): Promise<number[]>;
}
