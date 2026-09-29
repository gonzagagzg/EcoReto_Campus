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
import type { ArchivoSubido } from '../../../common/interfaces/archivo-subido.interface';
import type { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { opcionesEvidencia } from '../../../config/uploads.multer';
import { CrearParticipacionDto } from '../dto/crear-participacion.dto';
import { ParticipacionQueryDto } from '../dto/participacion-query.dto';
import { ParticipacionesService } from '../services/participaciones.service';

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
}
