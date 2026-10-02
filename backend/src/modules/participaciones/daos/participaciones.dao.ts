import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type DeepPartial, type Repository } from 'typeorm';
import { EstadoEvaluacion, Participacion } from '../entities/participacion.entity';
import { EstadoReto } from '../../retos/entities/reto.entity';

export interface FiltrosParticipacion {
  estadoParticipacion?: EstadoEvaluacion;
  idUsuario?: number;
  idRetosParticipantes?: number;
  skip?: number;
  take?: number;
}

export interface ParticipacionConReto {
  idParticipacion: number;
  idReto: number;
  idUsuario: number;
  nombreUsuario: string;
  nombreReto: string;
  evidencia: string;
  estadoParticipacion: EstadoEvaluacion;
  fechaEnvio: Date | null;
  fechaRevision: Date | null;
}

export interface PuntosParticipacion {
  idParticipacion: number;
  idReto: number;
  puntosCompletado: number;
  puntosParticipar: number;
  estado: EstadoEvaluacion;
  diasEstimados: number;
  diasCumplidos: number | null;
}

@Injectable()
export class ParticipacionesDao {
  constructor(
    @InjectRepository(Participacion)
    private readonly participacionRepo: Repository<Participacion>,
  ) {}

  async crear(datos: DeepPartial<Participacion>): Promise<Participacion> {
    const participacion = this.participacionRepo.create(datos);
    return this.participacionRepo.save(participacion);
  }

  buscarPorId(idParticipacion: number): Promise<Participacion | null> {
    return this.participacionRepo.findOne({
      where: { idParticipacion },
      relations: { retoParticipante: { reto: true } },
    });
  }

  async actualizar(
    idParticipacion: number,
    datos: DeepPartial<Participacion>,
  ): Promise<Participacion> {
    await this.participacionRepo.update(idParticipacion, datos);

    const participacion = await this.buscarPorId(idParticipacion);

    if (!participacion) {
      throw new Error(`Participacion ${idParticipacion} no encontrada`);
    }

    return participacion;
  }

  async listar(filtros: FiltrosParticipacion): Promise<{ items: Participacion[]; total: number }> {
    const query = this.participacionRepo.createQueryBuilder('participacion');

    if (filtros.estadoParticipacion) {
      query.andWhere('participacion.estado_participacion = :estado', {
        estado: filtros.estadoParticipacion,
      });
    }

    if (filtros.idUsuario) {
      query.andWhere('participacion.id_usuario = :idUsuario', { idUsuario: filtros.idUsuario });
    }

    if (filtros.idRetosParticipantes) {
      query.andWhere('participacion.id_retos_participantes = :idRetosParticipantes', {
        idRetosParticipantes: filtros.idRetosParticipantes,
      });
    }

    query
      .orderBy('participacion.id_participacion', 'DESC')
      .skip(filtros.skip ?? 0)
      .take(filtros.take ?? 20);

    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  async listarEvidenciasPendientes(
    take: number,
  ): Promise<{ items: ParticipacionConReto[]; total: number }> {
    const query = this.participacionRepo
      .createQueryBuilder('participacion')
      .innerJoin(
        'participacion.retoParticipante',
        'participante',
        'participante.id_retos_participantes = participacion.id_retos_participantes',
      )
      .innerJoin('participante.reto', 'reto', 'reto.id_reto = participante.id_reto')
      .innerJoin('participacion.usuario', 'usuario')
      .select([
        'participacion.id_participacion AS "idParticipacion"',
        'reto.id_reto AS "idReto"',
        'participacion.id_usuario AS "idUsuario"',
        "TRIM(CONCAT(usuario.nombre, ' ', usuario.apellido)) AS \"nombreUsuario\"",
        'reto.nombre_reto AS "nombreReto"',
        'participacion.imagen_evidencia AS "evidencia"',
        'participacion.estado_participacion AS "estadoParticipacion"',
        'participacion.fecha_revision AS "fechaRevision"',
      ])
      .where('participacion.estado_participacion = :estado', { estado: EstadoEvaluacion.Enviado })
      .orderBy('participacion.id_participacion', 'ASC')
      .take(take);

    const items = await query.getRawMany<ParticipacionConReto>();
    const total = await this.participacionRepo.count({
      where: { estadoParticipacion: EstadoEvaluacion.Enviado },
    });

    return { items, total };
  }

  async revisar(
    idParticipacion: number,
    estadoParticipacion: EstadoEvaluacion,
    idUsuarioRevisor: number,
    observacionRevision?: string,
    diasCumplidos?: number | null,
  ): Promise<Participacion> {
    await this.participacionRepo.update(idParticipacion, {
      estadoParticipacion,
      idUsuarioRevisor,
      observacionRevision: observacionRevision ?? null,
      fechaRevision: new Date(),
      diasCumplidos: diasCumplidos ?? null,
    });

    const participacion = await this.buscarPorId(idParticipacion);

    if (!participacion) {
      throw new Error(`Participacion ${idParticipacion} no encontrada`);
    }

    return participacion;
  }

  async contarPorEstado(): Promise<{ estado: EstadoEvaluacion; total: number }[]> {
    const filas = await this.participacionRepo
      .createQueryBuilder('participacion')
      .select('participacion.estado_participacion', 'estado')
      .addSelect('COUNT(*)', 'total')
      .groupBy('participacion.estado_participacion')
      .getRawMany<{ estado: EstadoEvaluacion; total: string }>();

    return filas.map((fila) => ({ estado: fila.estado, total: Number(fila.total) }));
  }

  async obtenerPuntosPorUsuario(idUsuario: number): Promise<PuntosParticipacion[]> {
    return this.participacionRepo
      .createQueryBuilder('participacion')
      .innerJoin(
        'participacion.retoParticipante',
        'participante',
        'participante.id_retos_participantes = participacion.id_retos_participantes',
      )
      .innerJoin('participante.reto', 'reto', 'reto.id_reto = participante.id_reto')
      .select([
        'participacion.id_participacion AS "idParticipacion"',
        'reto.id_reto AS "idReto"',
        'reto.puntos_completado AS "puntosCompletado"',
        'reto.puntos_participar AS "puntosParticipar"',
        'participacion.estado_participacion AS "estado"',
        'GREATEST(1, CEIL(EXTRACT(EPOCH FROM (reto.fecha_limite - reto.fecha_creacion)) / 86400)) AS "diasEstimados"',
        'participacion.dias_cumplidos AS "diasCumplidos"',
      ])
      .where('participacion.id_usuario = :idUsuario', { idUsuario })
      // Los puntos se liquidan al cerrar el reto (finalizado por el cleanup o ya vencido).
      .andWhere('(reto.estado_reto = :finalizado OR reto.fecha_limite <= :ahora)', {
        finalizado: EstadoReto.Finalizado,
        ahora: new Date(),
      })
      .getRawMany<PuntosParticipacion>();
  }

  async listarAprobadasPorUsuario(idUsuario: number): Promise<
    {
      idReto: number;
      idRetosParticipantes: number;
      idParticipacion: number;
    }[]
  > {
    return this.participacionRepo
      .createQueryBuilder('participacion')
      .innerJoin(
        'participacion.retoParticipante',
        'participante',
        'participante.id_retos_participantes = participacion.id_retos_participantes',
      )
      .select([
        'participante.id_reto AS "idReto"',
        'participacion.id_retos_participantes AS "idRetosParticipantes"',
        'participacion.id_participacion AS "idParticipacion"',
      ])
      .where('participacion.id_usuario = :idUsuario', { idUsuario })
      .andWhere('participacion.estado_participacion = :estado', {
        estado: EstadoEvaluacion.Aprobado,
      })
      .getRawMany();
  }
}
