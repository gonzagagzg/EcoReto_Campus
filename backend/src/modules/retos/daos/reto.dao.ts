import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type DeepPartial, LessThan, type Repository } from 'typeorm';
import { Dificultad, EstadoReto, Reto } from '../entities/reto.entity';
import { RetoParticipante } from '../entities/reto_participante.entity';
import type { FiltrosReto, RetoDaoInterface, RetoParticipacionActual } from './reto.dao.interface';

@Injectable()
export class RetoDao implements RetoDaoInterface {
  constructor(
    @InjectRepository(Reto) private readonly retoRepo: Repository<Reto>,
    @InjectRepository(RetoParticipante)
    private readonly participanteRepo: Repository<RetoParticipante>,
  ) {}

  async crear(datos: DeepPartial<Reto>): Promise<Reto> {
    const reto = this.retoRepo.create(datos);
    return this.retoRepo.save(reto);
  }

  buscarPorId(idReto: number): Promise<Reto | null> {
    return this.retoRepo.findOne({ where: { idReto } });
  }

  async listar(
    filtros: FiltrosReto,
  ): Promise<{ items: Reto[]; total: number }> {
    const query = this.retoRepo.createQueryBuilder('reto');

    if (filtros.estadoReto) {
      query.andWhere('reto.estado_reto = :estadoReto', {
        estadoReto: filtros.estadoReto,
      });
    } else if (filtros.soloVisibles) {
      query.andWhere('reto.estado_reto IN (:...estadosVisibles)', {
        estadosVisibles: [EstadoReto.Activo, EstadoReto.Finalizado],
      });
    }

    if (filtros.dificultad) {
      query.andWhere('reto.dificultad = :dificultad', {
        dificultad: filtros.dificultad,
      });
    }

    if (filtros.categoria) {
      query.andWhere('reto.categoria = :categoria', {
        categoria: filtros.categoria,
      });
    }

    if (filtros.idUsuarioCreador) {
      query.andWhere('reto.id_usuario_creador = :idUsuarioCreador', {
        idUsuarioCreador: filtros.idUsuarioCreador,
      });
    }

    if (filtros.busqueda) {
      query.andWhere(
        '(reto.nombre_reto ILIKE :busqueda OR reto.descripcion_reto ILIKE :busqueda)',
        { busqueda: `%${filtros.busqueda}%` },
      );
    }

    if (!filtros.incluirVencidos) {
      query.andWhere('reto.fecha_limite > :ahora', { ahora: new Date() });
    }

    query
      .orderBy('reto.fecha_creacion', 'DESC')
      .skip(filtros.skip ?? 0)
      .take(filtros.take ?? 20);

    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  async actualizar(idReto: number, datos: DeepPartial<Reto>): Promise<Reto> {
    const reto = await this.buscarPorId(idReto);

    if (!reto) {
      throw new Error(`Reto ${idReto} no encontrado`);
    }

    Object.assign(reto, datos);

    return this.retoRepo.save(reto);
  }

  async cambiarEstado(idReto: number, estadoReto: EstadoReto): Promise<Reto> {
    return this.actualizar(idReto, { estadoReto });
  }

  /** Baja lógica: sale del catálogo sin borrar sus participaciones. */
  async eliminar(idReto: number): Promise<boolean> {
    const reto = await this.buscarPorId(idReto);

    if (!reto) {
      return false;
    }

    if (reto.estadoReto === EstadoReto.Desactivado) {
      return true;
    }

    await this.cambiarEstado(idReto, EstadoReto.Desactivado);
    return true;
  }

  async registrarParticipante(
    idReto: number,
    idUsuario: number,
  ): Promise<RetoParticipante> {
    const previas = await this.participanteRepo.count({
      where: { idReto, idUsuario },
    });
    const participante = this.participanteRepo.create({
      idReto,
      idUsuario,
      numParticipacion: previas + 1,
    });

    return this.participanteRepo.save(participante);
  }

  existeParticipante(
    idReto: number,
    idUsuario: number,
  ): Promise<RetoParticipante | null> {
    return this.participanteRepo.findOne({ where: { idReto, idUsuario } });
  }

  obtenerParticipantes(idReto: number): Promise<RetoParticipante[]> {
    return this.participanteRepo.find({
      where: { idReto },
      order: { numParticipacion: 'ASC' },
    });
  }

  contarParticipantes(idReto: number): Promise<number> {
    return this.participanteRepo.count({ where: { idReto } });
  }

  async contarPorEstado(): Promise<
    { estadoReto: EstadoReto; total: number }[]
  > {
    const filas = await this.retoRepo
      .createQueryBuilder('reto')
      .select('reto.estado_reto', 'estadoReto')
      .addSelect('COUNT(*)', 'total')
      .groupBy('reto.estado_reto')
      .getRawMany<{ estadoReto: EstadoReto; total: string }>();

    return filas.map((fila) => ({
      estadoReto: fila.estadoReto,
      total: Number(fila.total),
    }));
  }

  async finalizarVencidos(fecha: Date): Promise<number> {
    const resultado = await this.retoRepo.update(
      { estadoReto: EstadoReto.Activo, fechaLimite: LessThan(fecha) },
      { estadoReto: EstadoReto.Finalizado },
    );

    return resultado.affected ?? 0;
  }

  async listarIdsVencidos(fecha: Date): Promise<number[]> {
    const retos = await this.retoRepo.find({
      select: { idReto: true },
      where: { estadoReto: EstadoReto.Activo, fechaLimite: LessThan(fecha) },
    });

    return retos.map((reto) => reto.idReto);
  }

  listarPorDificultad(dificultad: Dificultad): Promise<Reto[]> {
    return this.retoRepo.find({ where: { dificultad } });
  }

  async listarParticipacionesActuales(idUsuario: number): Promise<RetoParticipacionActual[]> {
    const query = this.participanteRepo
      .createQueryBuilder('participante')
      .innerJoin('participante.reto', 'reto')
      .select([
        'participante.id_retos_participantes AS "idRetosParticipantes"',
        'reto.id_reto AS "idReto"',
        'reto.nombre_reto AS "nombreReto"',
        'reto.imagen_reto AS "imagenReto"',
        'reto.descripcion_reto AS "descripcionReto"',
        'reto.categoria AS "categoria"',
        'reto.fecha_limite AS "fechaLimite"',
        'reto.dificultad AS "dificultad"',
        'reto.puntos_completado AS "puntosCompletado"',
        'reto.puntos_participar AS "puntosParticipar"',
        'reto.estado_reto AS "estadoReto"',
      ])
      .where('participante.id_usuario = :idUsuario', { idUsuario })
      .andWhere('reto.estado_reto = :estadoActivo', { estadoActivo: EstadoReto.Activo })
      .orderBy('reto.fecha_limite', 'ASC');

    const filas = await query.getRawMany<RetoParticipacionActual>();

    // Un usuario puede participar varias veces del mismo reto (num_participacion);
    // se muestra una sola tarjeta por reto con la participación más reciente.
    const porReto = new Map<number, RetoParticipacionActual>();
    for (const fila of filas) {
      const previa = porReto.get(fila.idReto);
      if (!previa || fila.idRetosParticipantes > previa.idRetosParticipantes) {
        porReto.set(fila.idReto, fila);
      }
    }

    return [...porReto.values()];
  }
}
