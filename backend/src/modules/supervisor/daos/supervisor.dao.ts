import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { EstadoEvaluacion, Participacion } from '../../participaciones/entities/participacion.entity';
import { EstadoReto, Reto } from '../../retos/entities/reto.entity';
import { EstadoUsuario, Usuario } from '../../usuarios/entities/usuario.entity';

export interface ColaSupervision {
  retosPendientesAprobacion: number;
  evidenciasPendientes: number;
  usuariosPendientesActivacion: number;
  ticketsSoportePendientes: number;
}

@Injectable()
export class SupervisorDao {
  constructor(
    @InjectRepository(Reto) private readonly retoRepo: Repository<Reto>,
    @InjectRepository(Participacion)
    private readonly participacionRepo: Repository<Participacion>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  async contarColas(): Promise<ColaSupervision> {
    const [retosPendientesAprobacion, evidenciasPendientes, usuariosPendientesActivacion] =
      await Promise.all([
        this.retoRepo.count({ where: { estadoReto: EstadoReto.PendienteAprobacion } }),
        this.participacionRepo.count({ where: { estadoParticipacion: EstadoEvaluacion.Enviado } }),
        this.usuarioRepo.count({ where: { estado: EstadoUsuario.Pendiente } }),
      ]);

    return {
      retosPendientesAprobacion,
      evidenciasPendientes,
      usuariosPendientesActivacion,
      ticketsSoportePendientes: 0,
    };
  }

  listarRetosPendientes(limite: number): Promise<Reto[]> {
    return this.retoRepo.find({
      where: { estadoReto: EstadoReto.PendienteAprobacion },
      order: { fechaCreacion: 'ASC' },
      take: limite,
    });
  }

  listarUsuariosPendientes(limite: number): Promise<Usuario[]> {
    return this.usuarioRepo.find({
      where: { estado: EstadoUsuario.Pendiente },
      order: { idUsuario: 'ASC' },
      take: limite,
    });
  }
}
