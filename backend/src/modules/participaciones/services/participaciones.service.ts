import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Repository } from 'typeorm';
import type { ArchivoSubido } from '../../../common/interfaces/archivo-subido.interface';
import {
  buildEvidenciaDir,
  buildEvidenciaNombreArchivo,
  buildEvidenciaPathRelativo,
  buildEvidenciaPrefijo,
  eliminarCarpeta,
  ensureUploadDir,
  uploadsRoot,
} from '../../../config/uploads.config';
import { RetosService } from '../../retos/services/retos.service';
import { Rol, Usuario } from '../../usuarios/entities/usuario.entity';
import { CrearParticipacionDto } from '../dto/crear-participacion.dto';
import { ParticipacionQueryDto } from '../dto/participacion-query.dto';
import { RevisionParticipacionDto } from '../dto/revision-participacion.dto';
import { ParticipacionesDao } from '../daos/participaciones.dao';
import { EstadoEvaluacion, type Participacion } from '../entities/participacion.entity';
import { calcularNivel, factorCumplimiento, calcularDiasEstimados } from '../../retos/reglas-reto';

@Injectable()
export class ParticipacionesService {
  constructor(
    private readonly participacionesDao: ParticipacionesDao,
    private readonly retosService: RetosService,
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
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

  async revisar(
    idParticipacion: number,
    dto: RevisionParticipacionDto,
    idUsuarioRevisor: number,
  ): Promise<Participacion> {
    const participacion = await this.obtener(idParticipacion);

    if (dto.estadoParticipacion === EstadoEvaluacion.Enviado) {
      throw new BadRequestException('La evidencia debe quedar Aprobado, Negado o Bloqueado');
    }

    const estadoAnterior = participacion.estadoParticipacion;
    const fueAprobadoAhora = dto.estadoParticipacion === EstadoEvaluacion.Aprobado && estadoAnterior !== EstadoEvaluacion.Aprobado;

    const revisada = await this.participacionesDao.revisar(
      idParticipacion,
      dto.estadoParticipacion,
      idUsuarioRevisor,
      dto.observacionRevision,
      dto.diasCumplidos ?? null,
    );

    // Si se aprobó ahora, otorgar puntos y actualizar nivel del usuario
    if (fueAprobadoAhora) {
      await this.otorgarPuntosPorAprobacion(participacion, dto.diasCumplidos ?? null);
    }

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
   * Otorga puntos al usuario por evidencia aprobada y actualiza su nivel.
   * Se usa factorCumplimiento para calcular el porcentaje según días cumplidos.
   */
  private async otorgarPuntosPorAprobacion(
    participacion: Participacion,
    diasCumplidos: number | null,
  ): Promise<void> {
    const reto = participacion.retoParticipante?.reto;

    if (!reto) {
      return;
    }

    // Calcular días estimados del reto (diferencia entre fecha_limite y fecha_creacion)
    const diasEstimados = calcularDiasEstimados(reto.fechaCreacion, reto.fechaLimite);

    // Calcular factor de cumplimiento (1 = 100%, 0.5 = 50%, 0 = 0%)
    const factor = factorCumplimiento(diasEstimados, diasCumplidos);
    const puntosGanados = Math.round(reto.puntosCompletado * factor);

    if (puntosGanados <= 0) {
      return;
    }

    const usuario = await this.usuarioRepo.findOne({ where: { idUsuario: participacion.idUsuario } });

    if (!usuario) {
      return;
    }

    const nuevosPuntos = usuario.puntos + puntosGanados;
    const nuevoHistorialPuntos = usuario.historialPuntos + puntosGanados;
    const nuevosRetosCumplidos = usuario.retosCumplidos + 1;
    const nuevoNivel = calcularNivel(nuevosRetosCumplidos);

    await this.usuarioRepo.update(usuario.idUsuario, {
      puntos: nuevosPuntos,
      historialPuntos: nuevoHistorialPuntos,
      retosCumplidos: nuevosRetosCumplidos,
      nivel: nuevoNivel,
    });
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
    return items.slice(0, limite);
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
