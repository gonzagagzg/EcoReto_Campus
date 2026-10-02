import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ArchivoSubido } from '../../../common/interfaces/archivo-subido.interface';
import {
  buildSoporteDir,
  buildSoporteNombreArchivo,
  buildSoportePathRelativo,
  ensureUploadDir,
} from '../../../config/uploads.config';
import { EstadoEvaluacion } from '../../participaciones/entities/participacion.entity';
import {
  type UsuarioDaoInterface,
  USUARIO_DAO,
} from '../../usuarios/daos/usuario.dao.interface';
import type { ActualizarUsuarioDto } from '../../usuarios/dto/actualizar-usuario.dto';
import { CrearSoporteDto } from '../dto/crear-soporte.dto';
import { ResponderSoporteDto } from '../dto/responder-soporte.dto';
import { SoporteQueryDto } from '../dto/soporte-query.dto';
import { SoporteDao, type TicketSoporte } from '../daos/soporte.dao';
import type { Soporte } from '../entities/soporte.entity';

@Injectable()
export class SoporteService {
  constructor(
    private readonly soporteDao: SoporteDao,
    @Inject(USUARIO_DAO) private readonly usuarioDao: UsuarioDaoInterface,
  ) {}

  async crear(
    dto: CrearSoporteDto,
    idUsuario: number,
    imagen?: ArchivoSubido,
  ): Promise<Soporte> {
    const ticket = await this.soporteDao.crear({
      ...dto,
      idUsuario,
      imagenesSoporte: null,
      fechaAtencion: null,
      estadoSoporte: EstadoEvaluacion.Enviado,
    });

    if (!imagen) {
      return ticket;
    }

    ticket.imagenesSoporte = await this.guardarImagen(ticket.idSoporte, imagen);

    return this.soporteDao.actualizar(ticket.idSoporte, {
      imagenesSoporte: ticket.imagenesSoporte,
    });
  }

  async obtener(idSoporte: number): Promise<Soporte> {
    const ticket = await this.soporteDao.buscarPorId(idSoporte);

    if (!ticket) {
      throw new NotFoundException(`Ticket de soporte ${idSoporte} no encontrado`);
    }

    return ticket;
  }

  async listar(query: SoporteQueryDto): Promise<{ items: TicketSoporte[]; total: number }> {
    const { pagina, limite, ...filtros } = query;

    return this.soporteDao.listar({
      ...filtros,
      skip: (pagina - 1) * limite,
      take: limite,
    });
  }

  /**
   * El Administrador responde el ticket y, si lo aprueba, aplica en el perfil del estudiante
   * los datos sensibles (nombre, apellido, cedula, correo) que el usuario no puede editar solo.
   * Primero se validan todos los valores y despues se persisten, para no dejar el perfil a medias.
   */
  async responder(idSoporte: number, dto: ResponderSoporteDto): Promise<Soporte> {
    const ticket = await this.obtener(idSoporte);

    if (dto.estadoSoporte === EstadoEvaluacion.Enviado) {
      throw new BadRequestException('El ticket debe quedar Aprobado, Negado o Bloqueado');
    }

    if (ticket.estadoSoporte !== EstadoEvaluacion.Enviado) {
      throw new BadRequestException('El ticket ya fue respondido y no puede modificarse');
    }

    const cambios = await this.construirCambiosPerfil(ticket.idUsuario, dto);

    if (dto.estadoSoporte === EstadoEvaluacion.Aprobado && cambios) {
      await this.usuarioDao.actualizar(ticket.idUsuario, cambios);
    }

    return this.soporteDao.atender(idSoporte, dto.estadoSoporte);
  }

  contarPorEstado() {
    return this.soporteDao.contarPorEstado();
  }

  /** Valida disponibilidad de correo y cedula antes de tocar el perfil. */
  private async construirCambiosPerfil(
    idUsuario: number,
    dto: ResponderSoporteDto,
  ): Promise<ActualizarUsuarioDto | null> {
    const cambios: ActualizarUsuarioDto = {
      ...(dto.nombre ? { nombre: dto.nombre } : {}),
      ...(dto.apellido ? { apellido: dto.apellido } : {}),
      ...(dto.cedula ? { cedula: dto.cedula } : {}),
      ...(dto.correo ? { correo: dto.correo } : {}),
    };

    if (Object.keys(cambios).length === 0) {
      return null;
    }

    if (dto.correo) {
      const existente = await this.usuarioDao.buscarPorCorreo(dto.correo);

      if (existente && existente.idUsuario !== idUsuario) {
        throw new BadRequestException('El correo ya esta registrado por otro usuario');
      }
    }

    if (dto.cedula) {
      const existente = await this.usuarioDao.buscarPorCedula(dto.cedula);

      if (existente && existente.idUsuario !== idUsuario) {
        throw new BadRequestException('La cedula ya esta registrada por otro usuario');
      }
    }

    return cambios;
  }

  private async guardarImagen(idSoporte: number, imagen: ArchivoSubido): Promise<string> {
    const directorio = ensureUploadDir(buildSoporteDir(idSoporte));
    const secuencia = await this.siguienteSecuencial(directorio, idSoporte);
    const nombreArchivo = buildSoporteNombreArchivo(idSoporte, secuencia);

    await writeFile(join(directorio, nombreArchivo), imagen.buffer);

    return buildSoportePathRelativo(idSoporte, secuencia);
  }

  private async siguienteSecuencial(directorio: string, idSoporte: number): Promise<number> {
    const prefijo = `${idSoporte}_soporte_`;
    const existentes = await readdir(directorio);
    const secuencias = existentes
      .filter((nombre) => nombre.startsWith(prefijo))
      .map((nombre) => Number(nombre.slice(prefijo.length, nombre.lastIndexOf('.'))))
      .filter((numero) => Number.isFinite(numero));

    return secuencias.length === 0 ? 1 : Math.max(...secuencias) + 1;
  }
}
