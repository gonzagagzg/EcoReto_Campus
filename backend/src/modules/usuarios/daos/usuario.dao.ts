import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, type DeepPartial, type Repository } from 'typeorm';
import { Gusto } from '../entities/gusto.entity';
import { GustoUsuario } from '../entities/gusto_usuario.entity';
import { EstadoGusto } from '../entities/gusto.entity';
import { EstadoUsuario, type Rol, Usuario } from '../entities/usuario.entity';
import type {
  FiltrosUsuario,
  FiltrosGusto,
  GustoUsuarioResultado,
  ProgresoUsuario,
  UsuarioDaoInterface,
} from './usuario.dao.interface';

@Injectable()
export class UsuarioDao implements UsuarioDaoInterface {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Gusto) private readonly gustoRepo: Repository<Gusto>,
    @InjectRepository(GustoUsuario)
    private readonly gustoUsuarioRepo: Repository<GustoUsuario>,
  ) {}

  async listarTopPorPuntos(rol: Rol, limite: number): Promise<Usuario[]> {
    return this.usuarioRepo
      .createQueryBuilder('usuario')
      .where('usuario.rol = :rol', { rol })
      .andWhere('usuario.estado = :estado', { estado: EstadoUsuario.Activo })
      .orderBy('usuario.historialPuntos', 'DESC')
      .addOrderBy('usuario.nivel', 'DESC')
      .take(limite)
      .getMany();
  }

  async crear(datos: DeepPartial<Usuario>): Promise<Usuario> {
    const usuario = this.usuarioRepo.create(datos);
    return this.usuarioRepo.save(usuario);
  }

  buscarPorId(idUsuario: number): Promise<Usuario | null> {
    return this.usuarioRepo.findOne({ where: { idUsuario } });
  }

  buscarPorIdConContrasena(idUsuario: number): Promise<Usuario | null> {
    return this.usuarioRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.contrasena')
      .where('usuario.id_usuario = :idUsuario', { idUsuario })
      .getOne();
  }

  buscarPorCorreo(correo: string): Promise<Usuario | null> {
    return this.usuarioRepo.findOne({
      where: { correo: correo.trim().toLowerCase() },
    });
  }

  buscarPorCorreoConContrasena(correo: string): Promise<Usuario | null> {
    return this.usuarioRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.contrasena')
      .where('usuario.correo = :correo', {
        correo: correo.trim().toLowerCase(),
      })
      .getOne();
  }

  buscarPorCedula(cedula: string): Promise<Usuario | null> {
    return this.usuarioRepo.findOne({ where: { cedula: cedula.trim() } });
  }

  async existeCorreoOCedula(correo: string, cedula: string): Promise<boolean> {
    const total = await this.usuarioRepo.count({
      where: [{ correo: correo.trim().toLowerCase() }, { cedula }],
    });

    return total > 0;
  }

  async listar(
    filtros: FiltrosUsuario,
  ): Promise<{ items: Usuario[]; total: number }> {
    const query = this.usuarioRepo.createQueryBuilder('usuario');

    if (filtros.estado) {
      query.andWhere('usuario.estado = :estado', { estado: filtros.estado });
    }

    if (filtros.excluirDesactivados) {
      query.andWhere('usuario.estado != :desactivado', {
        desactivado: EstadoUsuario.Desactivo,
      });
    }

    if (filtros.rol) {
      query.andWhere('usuario.rol = :rol', { rol: filtros.rol });
    }

    if (filtros.busqueda) {
      query.andWhere(
        '(usuario.nombre ILIKE :busqueda OR usuario.apellido ILIKE :busqueda OR usuario.correo ILIKE :busqueda OR usuario.alias ILIKE :busqueda)',
        { busqueda: `%${filtros.busqueda}%` },
      );
    }

    query
      .orderBy('usuario.id_usuario', 'DESC')
      .skip(filtros.skip ?? 0)
      .take(filtros.take ?? 20);

    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  async actualizar(
    idUsuario: number,
    datos: DeepPartial<Usuario>,
  ): Promise<Usuario> {
    const usuario = await this.buscarPorId(idUsuario);

    if (!usuario) {
      throw new Error(`Usuario ${idUsuario} no encontrado`);
    }

    Object.assign(usuario, datos);

    return this.usuarioRepo.save(usuario);
  }

  async actualizarEstado(
    idUsuario: number,
    estado: EstadoUsuario,
  ): Promise<Usuario> {
    return this.actualizar(idUsuario, { estado });
  }

  async cambiarRol(idUsuario: number, rol: Rol): Promise<Usuario> {
    return this.actualizar(idUsuario, { rol });
  }

  async establecerProgreso(
    idUsuario: number,
    progreso: ProgresoUsuario,
  ): Promise<void> {
    await this.usuarioRepo.update(idUsuario, {
      puntos: Math.max(0, progreso.puntos),
      retosCumplidos: Math.max(0, progreso.retosCumplidos),
      nivel: Math.max(0, progreso.nivel),
    });
  }

  /** Baja lógica: la cuenta pasa a 'desactivo' y sus datos quedan intactos. */
  async eliminar(idUsuario: number): Promise<boolean> {
    const usuario = await this.buscarPorId(idUsuario);

    if (!usuario) {
      return false;
    }

    if (usuario.estado === EstadoUsuario.Desactivo) {
      return true;
    }

    await this.actualizarEstado(idUsuario, EstadoUsuario.Desactivo);
    return true;
  }

  async listarGustos(idUsuario: number): Promise<Gusto[]> {
    const registros = await this.gustoUsuarioRepo.find({
      where: { idUsuario },
      relations: { gusto: true },
    });

    return registros.map((registro) => registro.gusto);
  }

  async reemplazarGustos(
    idUsuario: number,
    idsGustos: number[],
  ): Promise<GustoUsuarioResultado[]> {
    await this.gustoUsuarioRepo.delete({ idUsuario });

    if (idsGustos.length === 0) {
      return [];
    }

    const existentes = await this.gustoRepo.find({
      where: { idGusto: In(idsGustos) },
    });
    const registros = existentes.map((gusto) =>
      this.gustoUsuarioRepo.create({ idUsuario, idGusto: gusto.idGusto }),
    );
    const guardados = await this.gustoUsuarioRepo.save(registros);

    return guardados.map((registro, indice) => ({
      idGustoUsuario: registro.idGostoUsuario,
      idGusto: existentes[indice].idGusto,
      nombreGusto: existentes[indice].nombreGusto,
    }));
  }

  listarCatalogoGustos(): Promise<Gusto[]> {
    return this.gustoRepo.find({
      where: { estado: EstadoGusto.Activo },
      order: { nombreGusto: 'ASC' },
    });
  }

  /** Listado de gustos para admin con filtros y paginación. */
  async listarGustosAdmin(
    filtros: FiltrosGusto,
  ): Promise<{ items: Gusto[]; total: number }> {
    const query = this.gustoRepo.createQueryBuilder('gusto');

    if (filtros.busqueda) {
      query.andWhere('gusto.nombre_gusto ILIKE :busqueda', {
        busqueda: `%${filtros.busqueda}%`,
      });
    }

    if (filtros.estado) {
      query.andWhere('gusto.estado = :estado', { estado: filtros.estado });
    }

    query
      .orderBy('gusto.nombre_gusto', 'ASC')
      .skip(filtros.skip ?? 0)
      .take(filtros.take ?? 20);

    const [items, total] = await query.getManyAndCount();

    return { items, total };
  }

  /** Busca un gusto por ID. */
  buscarGustoPorId(idGusto: number): Promise<Gusto | null> {
    return this.gustoRepo.findOne({ where: { idGusto } });
  }

  /** Crea un nuevo gusto. */
  async crearGusto(datos: DeepPartial<Gusto>): Promise<Gusto> {
    const gusto = this.gustoRepo.create(datos);
    return this.gustoRepo.save(gusto);
  }

  /** Actualiza un gusto existente. */
  async actualizarGusto(
    idGusto: number,
    datos: DeepPartial<Gusto>,
  ): Promise<Gusto> {
    const gusto = await this.buscarGustoPorId(idGusto);

    if (!gusto) {
      throw new NotFoundException(`Gusto ${idGusto} no encontrado`);
    }

    Object.assign(gusto, datos);

    return this.gustoRepo.save(gusto);
  }

  /** Elimina (baja lógica) un gusto. */
  async eliminarGusto(idGusto: number): Promise<boolean> {
    const gusto = await this.buscarGustoPorId(idGusto);

    if (!gusto) {
      return false;
    }

    if (gusto.estado === EstadoGusto.Desactivo) {
      return true;
    }

    await this.gustoRepo.update(idGusto, { estado: EstadoGusto.Desactivo });
    return true;
  }

  async contarPorEstado(): Promise<{ estado: EstadoUsuario; total: number }[]> {
    const filas = await this.usuarioRepo
      .createQueryBuilder('usuario')
      .select('usuario.estado', 'estado')
      .addSelect('COUNT(*)', 'total')
      .groupBy('usuario.estado')
      .getRawMany<{ estado: EstadoUsuario; total: string }>();

    return filas.map((fila) => ({
      estado: fila.estado,
      total: Number(fila.total),
    }));
  }

  async obtenerIdsUsuarios(): Promise<number[]> {
    const usuarios = await this.usuarioRepo.find({
      select: { idUsuario: true },
    });
    return usuarios.map((usuario) => usuario.idUsuario);
  }
}
