import {
  Body,
  Controller,
  ForbiddenException,
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
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { ArchivoSubido } from '../../../common/interfaces/archivo-subido.interface';
import { opcionesImagen } from '../../../config/uploads.multer';
import { Rol } from '../../usuarios/entities/usuario.entity';
import type { Solicitud } from '../../usuarios/services/usuarios.service';
import { CrearSoporteDto } from '../dto/crear-soporte.dto';
import { ResponderSoporteDto } from '../dto/responder-soporte.dto';
import { SoporteQueryDto } from '../dto/soporte-query.dto';
import { SoporteService } from '../services/soporte.service';

@Controller('soporte')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SoporteController {
  constructor(private readonly soporteService: SoporteService) {}

  @Post()
  @UseInterceptors(FileInterceptor('imagen', opcionesImagen))
  crear(
    @Body() dto: CrearSoporteDto,
    @CurrentUser('idUsuario') idUsuario: number,
    @UploadedFile() imagen?: ArchivoSubido,
  ) {
    return this.soporteService.crear(dto, idUsuario, imagen);
  }

  @Get('mis-tickets')
  misTickets(
    @Query() query: SoporteQueryDto,
    @CurrentUser('idUsuario') idUsuario: number,
  ) {
    return this.soporteService.listar({ ...query, idUsuario });
  }

  /** El listado global de tickets es exclusivo del Administrador. */
  @Get()
  @Roles(Rol.Administrador)
  listar(@Query() query: SoporteQueryDto) {
    return this.soporteService.listar(query);
  }

  @Get('estadisticas')
  @Roles(Rol.Administrador)
  estadisticas() {
    return this.soporteService.contarPorEstado();
  }

  @Get(':id')
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() solicitante: Solicitud,
  ) {
    return this.soporteService.obtener(id).then((ticket) => {
      if (ticket.idUsuario !== solicitante.idUsuario && solicitante.rol !== Rol.Administrador) {
        throw new ForbiddenException('Solo puedes ver tus propios tickets');
      }

      return ticket;
    });
  }

  @Post(':id/responder')
  @Roles(Rol.Administrador)
  responder(@Param('id', ParseIntPipe) id: number, @Body() dto: ResponderSoporteDto) {
    return this.soporteService.responder(id, dto);
  }
}
