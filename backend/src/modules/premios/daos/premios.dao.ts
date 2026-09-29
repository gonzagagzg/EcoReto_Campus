import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type DeepPartial, type Repository } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { HistorialPremio } from '../entities/historial_premio.entity';
import { Premio } from '../entities/premio.entity';

export interface FiltrosPremio {
  busqueda?: string;
  puntosMaximos?: number;
  skip?: number;
  take?: number;
}

@Injectable()
export class PremiosDao {
  constructor(
    @InjectRepository(Premio) private readonly premioRepo: Repository<Premio>,
    @InjectRepository(HistorialPremio)
    private readonly historialRepo: Repository<HistorialPremio>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  async crear(datos: DeepPartial<Premio>): Promise<Premio> {
    const premio = this.premioRepo.create(datos);
    return this.premioRepo.save(premio);
  }

  buscarPorId(idPremio: number): Promise<Premio | null> {
    return this.premioRepo.findOne({ where: { idPremio } });
  }

  async listar(filtros: FiltrosPremio): Promise<{ items: Premio[]; total: number }> {
    const query = this.premioRepo.createQueryBuilder('premio');

    if (filtros.busqueda) {
      query.andWhere(
        '(premio.nombre_premio ILIKE :busqueda OR premio.descripcion_premio ILIKE :busqueda)',
        { busqueda: `%${filtros.busqueda}%` },
      );
    }

    if (filtros.puntosMaximos !== undefined) {
      query.andWhere('premio.puntos_premio <= :puntosMaximos', {
        puntosMaximos: filtros.puntosMaximos,
      });
    }

    query
      .orderBy('premio.puntos_premio', 'ASC')
      .skip(filtros.skip ?? 0)
      .take(filtros.take ?? 20);

    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  async actualizar(idPremio: number, datos: DeepPartial<Premio>): Promise<Premio> {
    const premio = await this.buscarPorId(idPremio);

    if (!premio) {
      throw new NotFoundException(`Premio ${idPremio} no encontrado`);
    }

    Object.assign(premio, datos);

    return this.premioRepo.save(premio);
  }

  async eliminar(idPremio: number): Promise<boolean> {
    const premio = await this.buscarPorId(idPremio);

    if (!premio) {
      return false;
    }

    await this.premioRepo.softRemove(premio);
    return true;
  }

  async canjear(idUsuario: number, idPremio: number): Promise<HistorialPremio> {
    return this.dataSource.transaction(async (manager) => {
      const premio = await manager.findOne(Premio, { where: { idPremio } });

      if (!premio) {
        throw new NotFoundException(`Premio ${idPremio} no encontrado`);
      }

      const usuario = await manager.findOne(Usuario, { where: { idUsuario } });

      if (!usuario) {
        throw new NotFoundException(`Usuario ${idUsuario} no encontrado`);
      }

      if (usuario.puntos < premio.puntosPremio) {
        throw new BadRequestException(
          `Puntos insuficientes: necesitas ${premio.puntosPremio} y tienes ${usuario.puntos}`,
        );
      }

      const historial = manager.create(HistorialPremio, {
        idPremio,
        idUsuario,
        fechaCanje: new Date(),
      });

      await manager.save(HistorialPremio, historial);
      await manager.decrement(Usuario, { idUsuario }, 'puntos', premio.puntosPremio);

      return historial;
    });
  }

  async historialPorUsuario(idUsuario: number): Promise<HistorialPremio[]> {
    return this.historialRepo.find({
      where: { idUsuario },
      relations: { premio: true },
      order: { fechaCanje: 'DESC' },
    });
  }

  /** Puntos ya gastados en canjes, para que el recalculo no los revierta. */
  async puntosCanjeados(idUsuario: number): Promise<number> {
    const resultado = await this.historialRepo
      .createQueryBuilder('historial')
      .innerJoin('historial.premio', 'premio', 'premio.id_premio = historial.id_premio')
      .select('COALESCE(SUM(premio.puntos_premio), 0)', 'total')
      .where('historial.id_usuario = :idUsuario', { idUsuario })
      .getRawOne<{ total: string }>();

    return Number(resultado?.total ?? 0);
  }
}
