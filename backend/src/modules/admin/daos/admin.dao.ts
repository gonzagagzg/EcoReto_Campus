import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type ObjectLiteral, type Repository } from 'typeorm';
import { EstadoEvaluacion, Participacion } from '../../participaciones/entities/participacion.entity';
import { Premio } from '../../premios/entities/premio.entity';
import { EstadoReto, Reto } from '../../retos/entities/reto.entity';
import { Soporte } from '../../soporte/entities/soporte.entity';
import { EstadoUsuario, type Rol, Usuario } from '../../usuarios/entities/usuario.entity';

export interface ResumenAdmin {
  totalUsuarios: number;
  usuariosPorEstado: { estado: EstadoUsuario; total: number }[];
  usuariosPorRol: { rol: Rol; total: number }[];
  totalRetos: number;
  retosPorEstado: { estadoReto: EstadoReto; total: number }[];
  totalParticipaciones: number;
  participacionesPorEstado: { estado: EstadoEvaluacion; total: number }[];
  totalPremios: number;
  totalTickets: number;
  soportePorEstado: { estado: EstadoEvaluacion; total: number }[];
  puntosEnCirculacion: number;
}

@Injectable()
export class AdminDao {
  constructor(
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Reto) private readonly retoRepo: Repository<Reto>,
    @InjectRepository(Participacion)
    private readonly participacionRepo: Repository<Participacion>,
    @InjectRepository(Premio) private readonly premioRepo: Repository<Premio>,
    @InjectRepository(Soporte) private readonly soporteRepo: Repository<Soporte>,
  ) {}

  async resumen(): Promise<ResumenAdmin> {
    const [
      totalUsuarios,
      usuariosPorEstado,
      usuariosPorRol,
      totalRetos,
      retosPorEstado,
      totalParticipaciones,
      participacionesPorEstado,
      totalPremios,
      totalTickets,
      soportePorEstado,
      puntos,
    ] = await Promise.all([
      this.usuarioRepo.count(),
      this.contarPorCampo(this.usuarioRepo, 'usuario', 'estado'),
      this.contarPorCampo(this.usuarioRepo, 'usuario', 'rol'),
      this.retoRepo.count(),
      this.contarPorCampo(this.retoRepo, 'reto', 'estado_reto'),
      this.participacionRepo.count(),
      this.contarPorCampo(this.participacionRepo, 'participacion', 'estado_participacion'),
      this.premioRepo.count(),
      this.soporteRepo.count(),
      this.contarPorCampo(this.soporteRepo, 'soporte', 'estado_soporte'),
      this.usuarioRepo
        .createQueryBuilder('usuario')
        .select('COALESCE(SUM(usuario.puntos), 0)', 'total')
        .getRawOne<{ total: string }>(),
    ]);

    return {
      totalUsuarios,
      usuariosPorEstado: usuariosPorEstado as ResumenAdmin['usuariosPorEstado'],
      usuariosPorRol: usuariosPorRol as unknown as ResumenAdmin['usuariosPorRol'],
      totalRetos,
      retosPorEstado: retosPorEstado as unknown as ResumenAdmin['retosPorEstado'],
      totalParticipaciones,
      participacionesPorEstado:
        participacionesPorEstado as ResumenAdmin['participacionesPorEstado'],
      totalPremios,
      totalTickets,
      soportePorEstado: soportePorEstado as ResumenAdmin['soportePorEstado'],
      puntosEnCirculacion: Number(puntos?.total ?? 0),
    };
  }

  private async contarPorCampo<T extends ObjectLiteral>(
    repo: Repository<T>,
    alias: string,
    columna: string,
  ): Promise<{ estado: string; total: number }[]> {
    const filas = await repo
      .createQueryBuilder(alias)
      .select(`${alias}.${columna}`, 'estado')
      .addSelect('COUNT(*)', 'total')
      .groupBy(`${alias}.${columna}`)
      .getRawMany<{ estado: string; total: string }>();

    return filas.map((fila) => ({ estado: fila.estado, total: Number(fila.total) }));
  }
}
