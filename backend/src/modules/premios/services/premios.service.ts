import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import type { HistorialPremio } from '../entities/historial_premio.entity';
import type { Premio } from '../entities/premio.entity';
import { ActualizarPremioDto } from '../dto/actualizar-premio.dto';
import { CanjearPremioDto } from '../dto/canjear-premio.dto';
import { CrearPremioDto } from '../dto/crear-premio.dto';
import { PremioQueryDto } from '../dto/premio-query.dto';
import { Rol } from '../../usuarios/entities/usuario.entity';
import type { Solicitud } from '../../usuarios/services/usuarios.service';
import { PremiosDao } from '../daos/premios.dao';
import type { ArchivoSubido } from '../../../common/interfaces/archivo-subido.interface';
import {
  buildPremioDir,
  buildPremioNombreArchivo,
  buildPremioPathRelativo,
  ensureUploadDir,
} from '../../../config/uploads.config';

@Injectable()
export class PremiosService {
  constructor(private readonly premiosDao: PremiosDao) {}

  /** Catálogo público: solo premios activos para todos los usuarios (incluidos admins). */
  async listarCatalogo(query: PremioQueryDto): Promise<{ items: Premio[]; total: number }> {
    const { pagina, limite, ...filtros } = query;

    return this.premiosDao.listar({
      ...filtros,
      incluyeDesactivados: false,
      skip: (pagina - 1) * limite,
      take: limite,
    });
  }

  /** Panel admin: admins ven todos (activos y desactivados). */
  async listarAdmin(
    query: PremioQueryDto,
    solicitante?: Solicitud,
  ): Promise<{ items: Premio[]; total: number }> {
    const { pagina, limite, ...filtros } = query;

    return this.premiosDao.listar({
      ...filtros,
      incluyeDesactivados: solicitante?.rol === Rol.Administrador,
      skip: (pagina - 1) * limite,
      take: limite,
    });
  }

  async obtener(idPremio: number): Promise<Premio> {
    const premio = await this.premiosDao.buscarPorId(idPremio);

    if (!premio) {
      throw new NotFoundException(`Premio ${idPremio} no encontrado`);
    }

    return premio;
  }

  async crear(dto: CrearPremioDto): Promise<Premio> {
    return this.premiosDao.crear({
      ...dto,
      imagenPremio: dto.imagenPremio ?? null,
    });
  }

  async actualizar(
    idPremio: number,
    dto: ActualizarPremioDto,
  ): Promise<Premio> {
    await this.obtener(idPremio);
    return this.premiosDao.actualizar(idPremio, dto);
  }

  /** Sube la imagen del premio a disco y devuelve la ruta relativa para BD. */
  async subirImagen(
    idPremio: number,
    archivo: ArchivoSubido,
  ): Promise<string> {
    await this.obtener(idPremio);
    const dir = ensureUploadDir(buildPremioDir(idPremio));
    const nombreArchivo = buildPremioNombreArchivo(idPremio);
    await writeFile(join(dir, nombreArchivo), archivo.buffer);
    return buildPremioPathRelativo(idPremio);
  }

  async eliminarImagen(idPremio: number): Promise<void> {
    await this.obtener(idPremio);
    const dir = buildPremioDir(idPremio);
    const { rm } = await import('node:fs/promises');
    await rm(dir, { recursive: true, force: true });
    await this.premiosDao.actualizar(idPremio, { imagenPremio: null });
  }

  async eliminar(idPremio: number): Promise<{ eliminado: boolean }> {
    return { eliminado: await this.premiosDao.eliminar(idPremio) };
  }

  canjear(idUsuario: number, dto: CanjearPremioDto): Promise<HistorialPremio> {
    return this.premiosDao.canjear(idUsuario, dto.idPremio);
  }

  historial(idUsuario: number): Promise<HistorialPremio[]> {
    return this.premiosDao.historialPorUsuario(idUsuario);
  }
}
