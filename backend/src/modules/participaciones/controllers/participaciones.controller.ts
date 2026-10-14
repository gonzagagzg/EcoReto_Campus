import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Rol } from '../../usuarios/entities/usuario.entity';
import type { ArchivoSubido } from '../../../common/interfaces/archivo-subido.interface';
import type { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { opcionesEvidencia } from '../../../config/uploads.multer';
import { CrearParticipacionDto } from '../dto/crear-participacion.dto';
import { ParticipacionQueryDto } from '../dto/participacion-query.dto';
import { ParticipacionesService } from '../services/participaciones.service';
import { ParticipacionConDetalle } from '../daos/participaciones.dao';

@Controller('participaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParticipacionesController {
  constructor(private readonly participacionesService: ParticipacionesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('evidencia', opcionesEvidencia))
  registrar(
    @Body() dto: CrearParticipacionDto,
    @CurrentUser('idUsuario') idUsuario: number,
    @UploadedFile() evidencia?: ArchivoSubido,
  ) {
    return this.participacionesService.registrar(dto, idUsuario, evidencia);
  }

  @Get('mis-participaciones')
  listarLasMias(
    @Query() query: ParticipacionQueryDto,
    @CurrentUser('idUsuario') idUsuario: number,
  ) {
    return this.participacionesService.listar({ ...query, idUsuario });
  }

  @Get('mis-participaciones-detalle')
  listarLasMiasConDetalle(
    @Query() query: ParticipacionQueryDto,
    @CurrentUser('idUsuario') idUsuario: number,
  ): Promise<{ items: ParticipacionConDetalle[]; total: number }> {
    return this.participacionesService.listarConDetalle({ ...query, idUsuario });
  }

  @Get(':id')
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.participacionesService.obtener(id, {
      idUsuario: usuario.idUsuario,
      rol: usuario.rol,
    });
  }

  /** Retos aprobados de otro usuario (perfil público, máx 3). */
  @Get('usuario/:idUsuario/publicos')
  listarAprobadosPublicos(@Param('idUsuario', ParseIntPipe) idUsuario: number) {
    return this.participacionesService.listarAprobadosPublicos(idUsuario);
  }

  /**
   * Cuenta las evidencias aprobadas de un usuario en un reto específico.
   * Cuenta TODAS las participaciones del usuario en ese reto (puede haber varias inscripciones).
   * Usado por el panel de administración para calcular automáticamente los
   * días cumplidos al revisar una evidencia.
   */
  @Get('reto/:idReto/usuario/:idUsuario/aprobadas')
  @Roles(Rol.Administrador, Rol.Supervisor)
  contarAprobadasPorRetoYUsuario(
    @Param('idReto', ParseIntPipe) idReto: number,
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
  ) {
    return this.participacionesService.contarAprobadasPorRetoYUsuario(idReto, idUsuario);
  }
}
