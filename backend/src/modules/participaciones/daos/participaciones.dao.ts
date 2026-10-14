import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type DeepPartial, type Repository } from 'typeorm';
import { EstadoEvaluacion, Participacion } from '../entities/participacion.entity';
import { EstadoReto } from '../../retos/entities/reto.entity';

export interface FiltrosParticipacion {
  estadoParticipacion?: EstadoEvaluacion;
  idUsuario?: number;
  idRetosParticipantes?: number;
  busqueda?: string;
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
  fechaRevision: Date | null;
  nombreReto: string;
}

export interface PuntosParticipacion {
  idParticipacion: number;
  idReto: number;
  puntosCompletado: number;
  puntosParticipar: number;
  estado: EstadoEvaluacion;
  diasEstimados: number;
  diasCumplidos: number | null;
  estadoReto: EstadoReto;
  fechaLimite: Date;
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

  /**
   * Verifica si el usuario ya subió evidencia hoy para este reto
   * que NO esté Negada ni Bloqueada (solo bloquea si está Enviado o Aprobado).
   * Usa CURRENT_DATE de PostgreSQL para evitar problemas de zona horaria.
   * Une con retos_participantes para filtrar por idReto (no por inscripción).
   */
  async existeEvidenciaHoy(idReto: number, idUsuario: number): Promise<boolean> {
    const existe = await this.participacionRepo
      .createQueryBuilder('p')
      .innerJoin('p.retoParticipante', 'rp')
      .where('rp.idReto = :idReto', { idReto })
      .andWhere('p.idUsuario = :idUsuario', { idUsuario })
      .andWhere('p.fecha_creacion::date = CURRENT_DATE')
      .andWhere("p.estado_participacion NOT IN ('Negado', 'Bloqueado')")
      .getExists();

    return existe;
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

    if (filtros.busqueda) {
      query
        .innerJoin('participacion.usuario', 'usuario')
        .andWhere(
          '(usuario.alias ILIKE :busqueda OR usuario.nombre ILIKE :busqueda OR usuario.apellido ILIKE :busqueda)',
          { busqueda: `%${filtros.busqueda}%` },
        );
    }

    query
      .orderBy('participacion.id_participacion', 'DESC')
      .skip(filtros.skip ?? 0)
      .take(filtros.take ?? 20);

    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  async listarConDetalle(filtros: FiltrosParticipacion): Promise<{ items: ParticipacionConDetalle[]; total: number }> {
    const query = this.participacionRepo
      .createQueryBuilder('participacion')
      .innerJoin(
        'participacion.retoParticipante',
        'participante',
        'participante.id_retos_participantes = participacion.id_retos_participantes',
      )
      .innerJoin('participante.reto', 'reto', 'reto.id_reto = participante.id_reto')
      .select([
        'participacion.id_participacion AS "idParticipacion"',
        'participacion.id_retos_participantes AS "idRetosParticipantes"',
        'participacion.id_usuario AS "idUsuario"',
        'participacion.imagen_evidencia AS "imagenEvidencia"',
        'participacion.estado_participacion AS "estadoParticipacion"',
        'participacion.id_usuario_revisor AS "idUsuarioRevisor"',
        'participacion.observacion_revision AS "observacionRevision"',
        'participacion.respuesta_evidencia AS "respuestaEvidencia"',
        'participacion.fecha_revision AS "fechaRevision"',
        'reto.nombre_reto AS "nombreReto"',
      ]);

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

    if (filtros.busqueda) {
      query
        .innerJoin('participacion.usuario', 'usuario')
        .andWhere(
          '(usuario.alias ILIKE :busqueda OR usuario.nombre ILIKE :busqueda OR usuario.apellido ILIKE :busqueda)',
          { busqueda: `%${filtros.busqueda}%` },
        );
    }

    query
      .orderBy('participacion.id_participacion', 'DESC')
      .skip(filtros.skip ?? 0)
      .take(filtros.take ?? 20);

    const items = await query.getRawMany<ParticipacionConDetalle>();

    // Fetch revisor aliases separately
    const idsRevisor = [...new Set(items.map((i) => i.idUsuarioRevisor).filter((id): id is number => id !== null))];
    if (idsRevisor.length > 0) {
      const revisores = await this.participacionRepo.manager
        .getRepository('Usuario')
        .createQueryBuilder('usuario')
        .select(['usuario.id_usuario AS "idUsuario"', 'usuario.alias AS "alias"'])
        .where('usuario.id_usuario IN (:...ids)', { ids: idsRevisor })
        .getRawMany<{ idUsuario: number; alias: string }>();

      const aliasMap = new Map(revisores.map((r) => [r.idUsuario, r.alias]));
      items.forEach((item) => {
        if (item.idUsuarioRevisor) {
          item.aliasRevisor = aliasMap.get(item.idUsuarioRevisor) ?? null;
        }
      });
    } else {
      items.forEach((item) => {
        item.aliasRevisor = null;
      });
    }

    // Count using the same query builder logic
    const countQuery = this.participacionRepo.createQueryBuilder('participacion');
    if (filtros.estadoParticipacion) {
      countQuery.andWhere('participacion.estado_participacion = :estado', {
        estado: filtros.estadoParticipacion,
      });
    }
    if (filtros.idUsuario) {
      countQuery.andWhere('participacion.id_usuario = :idUsuario', { idUsuario: filtros.idUsuario });
    }
    if (filtros.idRetosParticipantes) {
      countQuery.andWhere('participacion.id_retos_participantes = :idRetosParticipantes', {
        idRetosParticipantes: filtros.idRetosParticipantes,
      });
    }
    const total = await countQuery.getCount();

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
    respuestaEvidencia?: string,
  ): Promise<Participacion> {
    await this.participacionRepo.update(idParticipacion, {
      estadoParticipacion,
      idUsuarioRevisor,
      observacionRevision: observacionRevision ?? null,
      respuestaEvidencia: respuestaEvidencia ?? null,
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

  /**
   * Trae todas las participaciones del usuario con los datos del reto para
   * que ProgresoPuntosService agrupe por reto las evidencias aprobadas y
   * aplique el tramo de pago (100% al completar todos los dias requeridos,
   * 25% / 50% / 75% al cerrar el reto incompleto).
   */
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
        'reto.estado_reto AS "estadoReto"',
        'reto.fecha_limite AS "fechaLimite"',
      ])
      .where('participacion.id_usuario = :idUsuario', { idUsuario })
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
      .orderBy('participacion.id_participacion', 'DESC')
      .getRawMany();
  }

  /**
   * Cuenta las evidencias aprobadas de un usuario en un reto específico.
   * Cuenta TODAS las participaciones del usuario en ese reto (puede haber varias inscripciones).
   */
  async contarAprobadasPorRetoYUsuario(idReto: number, idUsuario: number): Promise<number> {
    return this.participacionRepo
      .createQueryBuilder('participacion')
      .innerJoin(
        'participacion.retoParticipante',
        'participante',
        'participante.id_retos_participantes = participacion.id_retos_participantes',
      )
      .where('participante.id_reto = :idReto', { idReto })
      .andWhere('participacion.id_usuario = :idUsuario', { idUsuario })
      .andWhere('participacion.estado_participacion = :estado', {
        estado: EstadoEvaluacion.Aprobado,
      })
      .getCount();
  }
}
