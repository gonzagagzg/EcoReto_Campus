import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ParticipacionQueryDto } from '../../participaciones/dto/participacion-query.dto';
import { ParticipacionesService } from '../../participaciones/services/participaciones.service';
import { CambiarEstadoUsuarioDto } from '../../usuarios/dto/cambiar-estado-usuario.dto';
import { UsuarioQueryDto } from '../../usuarios/dto/usuario-query.dto';
import { Rol, type Usuario } from '../../usuarios/entities/usuario.entity';
import { UsuariosService, type Solicitud } from '../../usuarios/services/usuarios.service';
import {
  type ParticipacionHistorial,
  type ResumenAdmin,
  AdminDao,
} from '../daos/admin.dao';
import { CambiarRolDto } from '../dto/cambiar-rol.dto';
import { EstadoUsuarioAdminDto } from '../dto/estado-usuario-admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminDao: AdminDao,
    private readonly usuariosService: UsuariosService,
    private readonly participacionesService: ParticipacionesService,
  ) {}

  resumen(): Promise<ResumenAdmin> {
    return this.adminDao.resumen();
  }

  listarUsuarios(query: UsuarioQueryDto, solicitante: Solicitud) {
    return this.usuariosService.listar(query, solicitante);
  }

  /** Historial de participaciones de todos los estudiantes, con nombres resueltos. */
  async listarParticipaciones(query: ParticipacionQueryDto): Promise<{
    items: ParticipacionHistorial[];
    total: number;
  }> {
    const { items, total } = await this.participacionesService.listar(query);

    return { items: await this.adminDao.resumirParticipaciones(items), total };
  }

  cambiarEstado(idUsuario: number, dto: EstadoUsuarioAdminDto): Promise<Usuario> {
    return this.usuariosService.cambiarEstado(idUsuario, {
      estado: dto.estado,
    } satisfies CambiarEstadoUsuarioDto);
  }

  async cambiarRol(
    idUsuario: number,
    dto: CambiarRolDto,
    idSolicitante: number,
  ): Promise<Usuario> {
    if (idUsuario === idSolicitante) {
      throw new BadRequestException('No puedes cambiar tu propio rol');
    }

    return this.usuariosService.cambiarRol(idUsuario, dto.rol);
  }

  activar(idUsuario: number): Promise<Usuario> {
    return this.usuariosService.activar(idUsuario);
  }

  eliminar(idUsuario: number, idSolicitante: number) {
    if (idUsuario === idSolicitante) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }

    return this.usuariosService.eliminar(idUsuario);
  }

  rolesDisponibles(): Rol[] {
    return Object.values(Rol);
  }
}
