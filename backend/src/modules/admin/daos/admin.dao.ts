import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type ObjectLiteral, type Repository } from 'typeorm';
import { EstadoEvaluacion, Participacion } from '../../participaciones/entities/participacion.entity';
import { Premio } from '../../premios/entities/premio.entity';
import { EstadoReto, Reto } from '../../retos/entities/reto.entity';
import { RetoParticipante } from '../../retos/entities/reto_participante.entity';
import { Soporte } from '../../soporte/entities/soporte.entity';
import { EstadoUsuario, type Rol, Usuario } from '../../usuarios/entities/usuario.entity';
import { HistorialPremio } from '../../premios/entities/historial_premio.entity';

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

/**
 * Una fila del historial con los nombres ya resueltos: la tabla del frontend
 * muestra el nombre del participante y del reto, nunca los ids crudos.
 */
export interface ParticipacionHistorial {
  idParticipacion: number;
  idRetosParticipantes: number;
  /** null solo si la inscripcion quedó sin reto asociado. */
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
  fechaRevision: Date | null;
  fechaCreacion: Date;
  diasCumplidos: number | null;
}

/**
 * Una fila del historial de canjes con nombres resueltos.
 */
export interface HistorialPremioAdmin {
  idHistorialPremio: number;
  idPremio: number;
  nombrePremio: string;
  idUsuario: number;
  nombreUsuario: string;
  aliasUsuario: string;
  fechaCanje: Date;
  estadoCanjePremio: string;
  fechaReclamo: Date | null;
  observacionCanje: string | null;
}

@Injectable()
export class AdminDao {
  constructor(
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Reto) private readonly retoRepo: Repository<Reto>,
    @InjectRepository(Participacion)
    private readonly participacionRepo: Repository<Participacion>,
    @InjectRepository(RetoParticipante)
    private readonly retosParticipantesRepo: Repository<RetoParticipante>,
    @InjectRepository(Premio) private readonly premioRepo: Repository<Premio>,
    @InjectRepository(Soporte) private readonly soporteRepo: Repository<Soporte>,
    @InjectRepository(HistorialPremio)
    private readonly historialPremioRepo: Repository<HistorialPremio>,
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

  /**
   * Resuelve los nombres que acompañan a un lote de participaciones: dos
   * consultas con IN sobre los ids distintos de la pagina, no una por fila.
   */
  async resumirParticipaciones(items: Participacion[]): Promise<ParticipacionHistorial[]> {
    const idsUsuario = [...new Set(items.map((p) => p.idUsuario))];
    const idsInscripcion = [...new Set(items.map((p) => p.idRetosParticipantes))];
    const idsRevisor = [...new Set(items.map((p) => p.idUsuarioRevisor).filter((id): id is number => id !== null))];

    const [usuarios, inscripciones, revisores] = await Promise.all([
      idsUsuario.length > 0
        ? this.usuarioRepo.find({
            where: { idUsuario: In(idsUsuario) },
            select: { idUsuario: true, nombre: true, apellido: true },
          })
        : Promise.resolve<Usuario[]>([]),
      idsInscripcion.length > 0
        ? this.retosParticipantesRepo.find({
            where: { idRetosParticipantes: In(idsInscripcion) },
            relations: { reto: true },
          })
        : Promise.resolve<RetoParticipante[]>([]),
      idsRevisor.length > 0
        ? this.usuarioRepo.find({
            where: { idUsuario: In(idsRevisor) },
            select: { idUsuario: true, alias: true },
          })
        : Promise.resolve<Usuario[]>([]),
    ]);

    const nombresUsuario = new Map(
      usuarios.map((u) => [u.idUsuario, `${u.nombre} ${u.apellido}`.trim()]),
    );
    const aliasRevisor = new Map(
      revisores.map((u) => [u.idUsuario, u.alias]),
    );
    const retos = new Map(
      inscripciones.map((i) => [i.idRetosParticipantes, i] as const),
    );

    return items.map((p) => {
      const inscripcion = retos.get(p.idRetosParticipantes);

      return {
        idParticipacion: p.idParticipacion,
        idRetosParticipantes: p.idRetosParticipantes,
        idReto: inscripcion?.idReto ?? null,
        idUsuario: p.idUsuario,
        nombreUsuario: nombresUsuario.get(p.idUsuario) ?? `Usuario ${p.idUsuario}`,
        nombreReto: inscripcion?.reto?.nombreReto ?? 'Reto no disponible',
        imagenEvidencia: p.imagenEvidencia,
        estadoParticipacion: p.estadoParticipacion,
        idUsuarioRevisor: p.idUsuarioRevisor,
        aliasRevisor: p.idUsuarioRevisor ? aliasRevisor.get(p.idUsuarioRevisor) ?? null : null,
        observacionRevision: p.observacionRevision,
        respuestaEvidencia: p.respuestaEvidencia,
        fechaRevision: p.fechaRevision,
        fechaCreacion: p.fechaCreacion,
        diasCumplidos: p.diasCumplidos,
      };
    });
  }

  /**
   * Lista el historial de canjes con nombres de usuario y premio resueltos.
   */
  async listarHistorialPremios(pagina: number, limite: number, busqueda?: string, estadoCanjePremio?: string): Promise<{
    items: HistorialPremioAdmin[];
    total: number;
  }> {
    const skip = (pagina - 1) * limite;

    const qb = this.historialPremioRepo
      .createQueryBuilder('hp')
      .innerJoin('hp.premio', 'premio')
      .innerJoin('hp.usuario', 'usuario')
      .select([
        'hp.id_historial_premio AS "idHistorialPremio"',
        'hp.id_premio AS "idPremio"',
        'premio.nombre_premio AS "nombrePremio"',
        'hp.id_usuario AS "idUsuario"',
        "TRIM(CONCAT(usuario.nombre, ' ', usuario.apellido)) AS \"nombreUsuario\"",
        'usuario.alias AS "aliasUsuario"',
        'hp.fecha_canje AS "fechaCanje"',
        'hp.fecha_reclamo AS "fechaReclamo"',
        'hp.observacion_canje AS "observacionCanje"',
        'hp.estado_canje_premio AS "estadoCanjePremio"',
      ])
      .orderBy('hp.fecha_canje', 'DESC');

    if (busqueda && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      qb.andWhere(
        '(premio.nombre_premio ILIKE :term OR usuario.nombre ILIKE :term OR usuario.apellido ILIKE :term OR usuario.alias ILIKE :term)',
        { term },
      );
    }

    if (estadoCanjePremio) {
      qb.andWhere('hp.estado_canje_premio = :estadoCanjePremio', { estadoCanjePremio });
    }

    const [items, total] = await Promise.all([
      qb.skip(skip).take(limite).getRawMany<HistorialPremioAdmin>(),
      qb.getCount(),
    ]);

    return { items, total };
  }

  /**
   * Actualiza el estado de un canje de premio.
   * Si el nuevo estado es 'reclamado', registra la fecha actual en fecha_reclamo.
   * Si el nuevo estado es 'negado', devuelve los puntos al usuario (solo puntos, no historial_puntos).
   */
  async actualizarEstadoCanjePremio(
    idHistorialPremio: number,
    estadoCanjePremio: string,
    observacionCanje?: string,
  ): Promise<void> {
    // Obtener el canje actual para saber el estado anterior, usuario y puntos
    const canjeActual = await this.historialPremioRepo.findOne({
      where: { idHistorialPremio },
      relations: { premio: true },
    });

    if (!canjeActual) {
      throw new Error(`Canje #${idHistorialPremio} no encontrado`);
    }

    const estadoAnterior = canjeActual.estadoCanjePremio;
    const puntosPremio = canjeActual.premio?.puntosPremio ?? 0;
    const idUsuario = canjeActual.idUsuario;

    const updateData: { estadoCanjePremio: string; fechaReclamo?: Date; observacionCanje?: string } = {
      estadoCanjePremio,
    };

    if (estadoCanjePremio === 'reclamado') {
      updateData.fechaReclamo = new Date();
    }

    if (observacionCanje !== undefined) {
      updateData.observacionCanje = observacionCanje;
    }

    // Si se cambia a 'negado' y no lo era antes, devolver puntos al usuario
    // Solo se suma a 'puntos' (disponibles), NO a 'historial_puntos' (acumulado histórico)
    if (estadoCanjePremio === 'negado' && estadoAnterior !== 'negado' && puntosPremio > 0) {
      await this.usuarioRepo.increment({ idUsuario }, 'puntos', puntosPremio);
    }

    // Si se cambia DE 'negado' a otro estado, quitar los puntos que se devolvieron
    if (estadoAnterior === 'negado' && estadoCanjePremio !== 'negado' && puntosPremio > 0) {
      await this.usuarioRepo.decrement({ idUsuario }, 'puntos', puntosPremio);
    }

    await this.historialPremioRepo.update(idHistorialPremio, updateData);
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
