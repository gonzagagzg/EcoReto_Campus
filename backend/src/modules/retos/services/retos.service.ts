import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ArchivoSubido } from '../../../common/interfaces/archivo-subido.interface';
import { buildRetoDir, buildRetoNombreArchivo, ensureUploadDir } from '../../../config/uploads.config';
import { Rol, Usuario } from '../../usuarios/entities/usuario.entity';
import { ActualizarRetoDto } from '../dto/actualizar-reto.dto';
import { CrearRetoDto } from '../dto/crear-reto.dto';
import { RetoQueryDto } from '../dto/reto-query.dto';
import { type FiltrosReto, RETO_DAO, type RetoDaoInterface } from '../daos/reto.dao.interface';
import { EstadoReto, type Reto } from '../entities/reto.entity';
import { RetoParticipante } from '../entities/reto_participante.entity';
import {
  calcularDificultad,
  calcularPuntosCompletado,
  calcularPuntosParticipar,
  DIAS_MAXIMOS_RETO,
  DIAS_MINIMOS_RETO,
} from '../reglas-reto';

export interface Solicitante {
  idUsuario: number;
  rol: Rol;
}

/**
 * Estados que cualquier usuario autenticado puede ver en el feed. Todo lo demas
 * (Pendiente_Aprobacion, Bloqueado, Negado y Desactivado) es interno del staff:
 * un reto Negado o Desactivado no se muestra en el inicio.
 */
const ESTADOS_VISIBLES: EstadoReto[] = [EstadoReto.Activo, EstadoReto.Finalizado];

@Injectable()
export class RetosService {
  constructor(
    @Inject(RETO_DAO) private readonly retoDao: RetoDaoInterface,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  /** Resuelve el alias del creador de cada reto, en una sola consulta. */
  private async resolverCreadores(items: Reto[]): Promise<(Reto & { creadorNombre?: string })[]> {
    const ids = [...new Set(items.map((r) => r.idUsuarioCreador))];
    if (ids.length === 0) {
      return items as (Reto & { creadorNombre?: string })[];
    }

    const creadores = await this.usuarioRepo.find({ where: { idUsuario: In(ids) } });
    const porId = new Map(creadores.map((u) => [u.idUsuario, u.alias]));

    return items.map((reto) => ({
      ...reto,
      creadorNombre: porId.get(reto.idUsuarioCreador),
    }));
  }

  async crear(
    dto: CrearRetoDto,
    idUsuarioCreador: number,
    imagen?: ArchivoSubido,
  ): Promise<Reto> {
    const puntaje = this.calcularPuntaje(dto.fechaLimite);

    const reto = await this.retoDao.crear({
      ...dto,
      idUsuarioCreador,
      estadoReto: EstadoReto.PendienteAprobacion,
      imagenReto: null,
      ...puntaje,
    });

    if (!imagen) {
      return reto;
    }

    const imagenReto = await this.guardarImagen(reto.idReto, imagen);

    return this.retoDao.actualizar(reto.idReto, { imagenReto });
  }

  /**
   * Busca un reto. Cuando se informa el solicitante se exige que el estado sea visible;
   * las llamadas internas (actualizar, eliminar, participar) omiten el parametro.
   */
  async obtener(idReto: number, solicitante?: Solicitante): Promise<Reto> {
    const reto = await this.retoDao.buscarPorId(idReto);

    if (!reto) {
      throw new NotFoundException(`Reto ${idReto} no encontrado`);
    }

    if (solicitante && !this.esStaff(solicitante.rol) && !ESTADOS_VISIBLES.includes(reto.estadoReto)) {
      throw new NotFoundException(`Reto ${idReto} no encontrado`);
    }

    return reto;
  }

  async listar(
    query: RetoQueryDto,
    solicitante: Solicitante,
  ): Promise<{ items: Reto[]; total: number }> {
    const { pagina, limite, incluirVencidos, todosEstados, estadoReto, ...filtros } = query;
    const esStaff = this.esStaff(solicitante.rol);

    if (!esStaff && (todosEstados === true || incluirVencidos === true)) {
      throw new ForbiddenException(
        'Solo Supervisores y Administradores pueden listar retos vencidos o estados restringidos',
      );
    }

    if (
      !esStaff &&
      estadoReto !== undefined &&
      !ESTADOS_VISIBLES.includes(estadoReto)
    ) {
      throw new ForbiddenException('No puedes filtrar por estados restringidos del reto');
    }

    const { items, total } = await this.retoDao.listar({
      ...filtros,
      estadoReto,
      soloVisibles: todosEstados !== true,
      incluirVencidos: incluirVencidos === true,
      skip: (pagina - 1) * limite,
      take: limite,
    } as FiltrosReto);

    return { items: await this.resolverCreadores(items), total };
  }

  async actualizar(
    idReto: number,
    dto: ActualizarRetoDto,
    solicitante: Solicitante,
  ): Promise<Reto> {
    const reto = await this.obtener(idReto);

    this.validarPermiso(reto, solicitante);

    if (!dto.fechaLimite) {
      return this.retoDao.actualizar(idReto, dto);
    }

    const puntaje = this.calcularPuntaje(dto.fechaLimite, reto.fechaCreacion);

    return this.retoDao.actualizar(idReto, { ...dto, ...puntaje });
  }

  async cambiarEstado(idReto: number, estadoReto: EstadoReto): Promise<Reto> {
    await this.obtener(idReto);
    return this.retoDao.cambiarEstado(idReto, estadoReto);
  }

  async eliminar(idReto: number, solicitante: Solicitante): Promise<{ eliminado: boolean }> {
    const reto = await this.obtener(idReto);

    this.validarPermiso(reto, solicitante);

    // Mismo criterio que decidirReto: un reto finalizado ya liquido sus puntos
    // y no puede volver a estar activo, asi que tampoco se le da de baja.
    if (reto.estadoReto === EstadoReto.Finalizado) {
      throw new BadRequestException('El reto ya se finalizo y no admite cambios de estado');
    }

    // Baja logica: la imagen se conserva para que el reto se pueda restaurar.
    const eliminado = await this.retoDao.eliminar(idReto);

    return { eliminado };
  }

  async registrarParticipacion(idReto: number, idUsuario: number): Promise<RetoParticipante> {
    const reto = await this.obtener(idReto);

    if (reto.estadoReto !== EstadoReto.Activo) {
      throw new BadRequestException('El reto no esta activo');
    }

    if (reto.fechaLimite.getTime() < Date.now()) {
      throw new BadRequestException('El reto ya vencio');
    }

    return this.retoDao.registrarParticipante(idReto, idUsuario);
  }

  obtenerParticipantes(idReto: number): Promise<RetoParticipante[]> {
    return this.retoDao.obtenerParticipantes(idReto);
  }

  contarParticipantes(idReto: number): Promise<number> {
    return this.retoDao.contarParticipantes(idReto);
  }

  contarPorEstado() {
    return this.retoDao.contarPorEstado();
  }

  private esStaff(rol: Rol): boolean {
    return rol === Rol.Administrador || rol === Rol.Supervisor;
  }

  private validarPermiso(reto: Reto, solicitante: Solicitante): void {
    if (!this.esStaff(solicitante.rol) && reto.idUsuarioCreador !== solicitante.idUsuario) {
      throw new ForbiddenException('Solo el creador o un supervisor puede modificar el reto');
    }
  }

  /**
   * Valida la duracion y devuelve dificultad y puntos calculados por el servidor.
   * La duracion siempre se mide desde `fechaBase` (la creacion del reto), no desde el momento
   * de la actualizacion, para que editar la fecha limite no altere el punto de partida.
   */
  private calcularPuntaje(
    fechaLimite: Date,
    fechaBase: Date = new Date(),
  ): {
    dificultad: ReturnType<typeof calcularDificultad>;
    puntosCompletado: number;
    puntosParticipar: number;
  } {
    const diasEstimados = Math.ceil(
      (fechaLimite.getTime() - fechaBase.getTime()) / 86_400_000,
    );

    if (diasEstimados < DIAS_MINIMOS_RETO) {
      throw new BadRequestException(
        `El reto debe durar al menos ${DIAS_MINIMOS_RETO} dias para ser Fácil`,
      );
    }

    if (diasEstimados > DIAS_MAXIMOS_RETO) {
      throw new BadRequestException(
        `El reto no puede durar mas de ${DIAS_MAXIMOS_RETO} dias`,
      );
    }

    const dificultad = calcularDificultad(diasEstimados);
    const puntosCompletado = calcularPuntosCompletado(diasEstimados, dificultad);

    return {
      dificultad,
      puntosCompletado,
      puntosParticipar: calcularPuntosParticipar(puntosCompletado),
    };
  }

  private async guardarImagen(idReto: number, imagen: ArchivoSubido): Promise<string> {
    const directorio = ensureUploadDir(buildRetoDir(idReto));
    const nombreArchivo = buildRetoNombreArchivo(idReto);

    await writeFile(join(directorio, nombreArchivo), imagen.buffer);

    return join('Imagenesretos', 'Retos', String(idReto), nombreArchivo);
  }
}
