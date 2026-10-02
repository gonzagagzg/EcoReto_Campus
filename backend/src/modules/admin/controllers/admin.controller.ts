import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ParticipacionQueryDto } from '../../participaciones/dto/participacion-query.dto';
import { UsuarioQueryDto } from '../../usuarios/dto/usuario-query.dto';
import { Rol } from '../../usuarios/entities/usuario.entity';
import type { Solicitud } from '../../usuarios/services/usuarios.service';
import { CambiarRolDto } from '../dto/cambiar-rol.dto';
import { EstadoUsuarioAdminDto } from '../dto/estado-usuario-admin.dto';
import { MetricasQueryDto } from '../dto/metricas-query.dto';
import { AdminService } from '../services/admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.Administrador)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('resumen')
  resumen(@Query() _query: MetricasQueryDto) {
    return this.adminService.resumen();
  }

  @Get('usuarios')
  listarUsuarios(@Query() query: UsuarioQueryDto, @CurrentUser() solicitante: Solicitud) {
    return this.adminService.listarUsuarios(query, solicitante);
  }

  @Get('participaciones')
  @Roles(Rol.Administrador, Rol.Supervisor)
  listarParticipaciones(@Query() query: ParticipacionQueryDto) {
    return this.adminService.listarParticipaciones(query);
  }

  @Get('roles')
  roles() {
    return this.adminService.rolesDisponibles();
  }

  @Patch('usuarios/:id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EstadoUsuarioAdminDto,
  ) {
    return this.adminService.cambiarEstado(id, dto);
  }

  @Patch('usuarios/:id/rol')
  cambiarRol(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarRolDto,
    @CurrentUser('idUsuario') idSolicitante: number,
  ) {
    return this.adminService.cambiarRol(id, dto, idSolicitante);
  }

  @Post('usuarios/:id/activar')
  activar(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.activar(id);
  }

  @Delete('usuarios/:id')
  @HttpCode(HttpStatus.OK)
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('idUsuario') idSolicitante: number,
  ) {
    return this.adminService.eliminar(id, idSolicitante);
  }
}
