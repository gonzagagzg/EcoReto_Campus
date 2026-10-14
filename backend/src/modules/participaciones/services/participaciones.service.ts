import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ArchivoSubido } from '../../../common/interfaces/archivo-subido.interface';
import {
  buildEvidenciaDir,
  buildEvidenciaNombreArchivo,
  buildEvidenciaPathRelativo,
  buildEvidenciaPrefijo,
  eliminarCarpeta,
  ensureUploadDir,
  esCarpetaBorradoSegura,
  uploadsRoot,
} from '../../../config/uploads.config';
import { RetosService } from '../../retos/services/retos.service';
import { Rol } from '../../usuarios/entities/usuario.entity';
import { CrearParticipacionDto } from '../dto/crear-participacion.dto';
import { ParticipacionQueryDto } from '../dto/participacion-query.dto';
import { RevisionParticipacionDto } from '../dto/revision-participacion.dto';
import { ParticipacionesDao, ParticipacionConDetalle } from '../daos/participaciones.dao';
import { EstadoEvaluacion, type Participacion } from '../entities/participacion.entity';
import { ProgresoPuntosService } from './progreso-puntos.service';

@Injectable()
export class ParticipacionesService {
  constructor(
    private readonly participacionesDao: ParticipacionesDao,
    private readonly retosService: RetosService,
    private readonly progresoPuntos: ProgresoPuntosService,
  ) {}

  async registrar(
    dto: CrearParticipacionDto,
    idUsuario: number,
    evidencia?: ArchivoSubido,
  ): Promise<Participacion> {
    if (!evidencia) {
      throw new BadRequestException('Debes adjuntar la evidencia del reto');
    }

    const participante = await this.retosService.registrarParticipacion(dto.idReto, idUsuario);

    // Verificar si ya subió evidencia hoy para ESTE RETO (no por inscripción)
    const yaSubioHoy = await this.participacionesDao.existeEvidenciaHoy(dto.idReto, idUsuario);
    if (yaSubioHoy) {
      throw new BadRequestException('Ya has subido una evidencia hoy para este reto. Puedes subir otra mañana.');
    }

    const participacion = await this.participacionesDao.crear({
      idRetosParticipantes: participante.idRetosParticipantes,
      idUsuario,
      imagenEvidencia: '',
      estadoParticipacion: EstadoEvaluacion.Enviado,
      idUsuarioRevisor: null,
      observacionRevision: dto.comentario ?? null,
      fechaRevision: null,
    });

    const imagenEvidencia = await this.guardarEvidencia(
      dto.idReto,
      participante.idRetosParticipantes,
      participacion.idParticipacion,
      idUsuario,
      evidencia,
    );

    return this.participacionesDao.actualizar(participacion.idParticipacion, {
      imagenEvidencia,
    });
  }

  /** El detalle solo es visible para el dueño de la participacion o para personal autorizado. */
  async obtener(
    idParticipacion: number,
    solicitante?: { idUsuario: number; rol: Rol },
  ): Promise<Participacion> {
    const participacion = await this.participacionesDao.buscarPorId(idParticipacion);

    if (!participacion) {
      throw new NotFoundException(`Participacion ${idParticipacion} no encontrada`);
    }

    if (solicitante) {
      const esStaff = solicitante.rol === Rol.Administrador || solicitante.rol === Rol.Supervisor;

      if (!esStaff && participacion.idUsuario !== solicitante.idUsuario) {
        throw new NotFoundException(`Participacion ${idParticipacion} no encontrada`);
      }
    }

    return participacion;
  }

async listar(
    query: ParticipacionQueryDto,
  ): Promise<{ items: Participacion[]; total: number }> {
    const { pagina, limite, ...filtros } = query;

    return this.participacionesDao.listar({
      ...filtros,
      skip: (pagina - 1) * limite,
      take: limite,
    });
  }

  async listarConDetalle(
    query: ParticipacionQueryDto,
  ): Promise<{ items: ParticipacionConDetalle[]; total: number }> {
    const { pagina, limite, ...filtros } = query;

    return this.participacionesDao.listarConDetalle({
      ...filtros,
      skip: (pagina - 1) * limite,
      take: limite,
    });
  }

  async revisar(
    idParticipacion: number,
    dto: RevisionParticipacionDto,
    idUsuarioRevisor: number,
    revisorNombre?: string,
  ): Promise<Participacion> {
    const participacion = await this.obtener(idParticipacion);

    if (dto.estadoParticipacion === EstadoEvaluacion.Enviado) {
      throw new BadRequestException('La evidencia debe quedar Aprobado, Negado o Bloqueado');
    }

    const revisada = await this.participacionesDao.revisar(
      idParticipacion,
      dto.estadoParticipacion,
      idUsuarioRevisor,
      dto.observacionRevision,
      dto.diasCumplidos ?? null,
      dto.respuestaEvidencia,
    );

    // Apruebe o niegue: se recalcula todo el progreso al instante con la misma
    // funcion que usa la cron, de modo que los puntos suben o bajan ya.
    await this.progresoPuntos.recalcularUsuario(participacion.idUsuario);

    const sinEvidencia = await this.aplicarLimpiezaEvidencia(
      participacion,
      dto.estadoParticipacion,
    );

    // Si el archivo se borro, la referencia tambien: no dejar rutas muertas en la respuesta.
    // La columna es NOT NULL, asi que se vacia en lugar de dejar null.
    return sinEvidencia
      ? this.participacionesDao.actualizar(idParticipacion, { imagenEvidencia: '' })
      : revisada;
  }

  /**
   * Al aprobar o negar se elimina la carpeta de evidencias; si queda Bloqueado se conserva
   * para que el participante pueda corregirla. Devuelve si habia evidencia que limpiar.
   */
  private async aplicarLimpiezaEvidencia(
    participacion: Participacion,
    estadoParticipacion: EstadoEvaluacion,
  ): Promise<boolean> {
    if (estadoParticipacion === EstadoEvaluacion.Bloqueado || !participacion.imagenEvidencia) {
      return false;
    }

    const carpeta = join(uploadsRoot(), dirname(participacion.imagenEvidencia));

    // La referencia en BD podria no traer subcarpeta (dirname '.'): en ese caso
    // no hay nada que borrar en disco, pero la referencia si debe limpiarse.
    // Jamas se borra la raiz de uploads ni rutas fuera de ella.
    if (!esCarpetaBorradoSegura(carpeta)) {
      return true;
    }

    await eliminarCarpeta(carpeta);

    return true;
  }

  contarPorEstado() {
    return this.participacionesDao.contarPorEstado();
  }

  listarEvidenciasPendientes(limite: number) {
    return this.participacionesDao.listarEvidenciasPendientes(limite);
  }

  /** Retos aprobados de un usuario (para perfil público, máx 3). */
  async listarAprobadosPublicos(idUsuario: number, limite = 3): Promise<
    {
      idReto: number;
      idRetosParticipantes: number;
      idParticipacion: number;
    }[]
  > {
    const items = await this.participacionesDao.listarAprobadasPorUsuario(idUsuario);

    // Una sola tarjeta por reto (la evidencia mas reciente): el DAO ya viene
    // ordenado por id descendente, asi que la primera aparicion manda.
    const porReto = new Map<number, (typeof items) [number]>();
    for (const item of items) {
      if (!porReto.has(item.idReto)) {
        porReto.set(item.idReto, item);
      }
    }

    return [...porReto.values()].slice(0, limite);
  }

  /**
   * Cuenta cuántas evidencias aprobadas tiene un usuario en un reto específico.
   * Sirve para calcular los días cumplidos automáticamente (cuenta TODAS las participaciones
   * del usuario en ese reto, no solo la inscripción actual).
   */
  async contarAprobadasPorRetoYUsuario(idReto: number, idUsuario: number): Promise<number> {
    return this.participacionesDao.contarAprobadasPorRetoYUsuario(idReto, idUsuario);
  }

  private async guardarEvidencia(
    idReto: number,
    idRetosParticipantes: number,
    idParticipacion: number,
    idUsuario: number,
    evidencia: ArchivoSubido,
  ): Promise<string> {
    const prefijo = buildEvidenciaPrefijo(
      idReto,
      idRetosParticipantes,
      idParticipacion,
      idUsuario,
    );
    const directorio = ensureUploadDir(
      buildEvidenciaDir(idReto, idRetosParticipantes, idParticipacion, idUsuario),
    );
    const secuencia = await this.siguienteSecuencial(directorio, prefijo);
    const nombreArchivo = buildEvidenciaNombreArchivo(prefijo, secuencia);

    await writeFile(join(directorio, nombreArchivo), evidencia.buffer);

    return buildEvidenciaPathRelativo(prefijo, secuencia);
  }

  private async siguienteSecuencial(directorio: string, prefijo: string): Promise<number> {
    const existentes = await readdir(directorio);
    const secuencia = existentes
      .map((nombre) => /^.*_(\d+)\.[a-z0-9]+$/i.exec(nombre))
      .filter((coincidencia): coincidencia is RegExpExecArray => coincidencia !== null)
      .filter((coincidencia) => coincidencia[0].startsWith(`${prefijo}_`))
      .map((coincidencia) => Number(coincidencia[1]))
      .filter((numero) => Number.isFinite(numero));

    return secuencia.length === 0 ? 1 : Math.max(...secuencia) + 1;
  }
}
