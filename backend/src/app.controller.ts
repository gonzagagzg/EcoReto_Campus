import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { CurrentUser } from './common/decorators/current-user.decorator';
import { Roles } from './common/decorators/roles.decorator';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { VaciarLogsDto } from './modules/admin/dto/vaciar-logs.dto';
import { Rol } from './modules/usuarios/entities/usuario.entity';
import type { UsuarioAutenticado } from './common/interfaces/usuario-autenticado.interface';
import {
  AppService,
  type DatosDashboard,
  type Estadisticas,
  type LogUsuario,
} from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Raiz de la API. Solo sirve como "estoy vivo": responde 204 sin cuerpo.
   * El estado real de conexiones lo sirve el SSE del panel.
   */
  @Get()
  @HttpCode(HttpStatus.NO_CONTENT)
  raiz(@Res() res: Response): void {
    res.send();
  }

  /**
   * Valida la sesion del panel: el JwtAuthGuard resuelve 401 si el token no
   * existe o expiro y el RolesGuard+Rol resuelve 403 si no es Administrador.
   * El panel lo llama antes de renderizar para no dejar entrar con un token
   * viejo.
   */
  @Get('admin/session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.Administrador)
  getSession(@CurrentUser() usuario: UsuarioAutenticado) {
    return { alias: usuario.alias, rol: usuario.rol };
  }

  @Get('admin/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.Administrador)
  getDashboard(): Promise<DatosDashboard> {
    return this.appService.getDashboard();
  }

  @Get('admin/estadisticas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.Administrador)
  getEstadisticas(): Promise<Estadisticas> {
    return this.appService.getEstadisticas();
  }

  @Get('admin/logs-usuarios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.Administrador)
  getLogsUsuarios(
    @Query('buscar') buscar?: string,
    @Query('limite') limite?: string,
  ): Promise<LogUsuario[]> {
    return this.appService.getLogsUsuarios(buscar ?? '', Number(limite) || 150);
  }

  @Post('admin/logs/vaciar')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.Administrador)
  vaciarLogs(
    @CurrentUser('idUsuario') idUsuario: number,
    @Body() dto: VaciarLogsDto,
  ): Promise<{ eliminados: number }> {
    return this.appService.vaciarLogs(idUsuario, dto.contrasena);
  }

  @Sse('admin/stream')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.Administrador)
  stream(): Observable<MessageEvent> {
    return this.appService.streamDashboard();
  }
}
