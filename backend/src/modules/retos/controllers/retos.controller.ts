import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
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
import type { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { opcionesImagen } from '../../../config/uploads.multer';
import { ActualizarRetoDto } from '../dto/actualizar-reto.dto';
import { CrearRetoDto } from '../dto/crear-reto.dto';
import { RetoQueryDto } from '../dto/reto-query.dto';
import { Rol } from '../../usuarios/entities/usuario.entity';
import { RetosService } from '../services/retos.service';
import { RetoParticipacionActual } from '../daos/reto.dao.interface';

@Controller('retos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RetosController {
  constructor(private readonly retosService: RetosService) {}

  @Get()
  listar(@Query() query: RetoQueryDto, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.retosService.listar(query, {
      idUsuario: usuario.idUsuario,
      rol: usuario.rol,
    });
  }

  @Get('mis-participaciones')
  listarMisParticipaciones(
    @CurrentUser('idUsuario') idUsuario: number,
  ): Promise<RetoParticipacionActual[]> {
    return this.retosService.listarParticipacionesActuales(idUsuario);
  }

  @Get(':id')
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.retosService.obtener(id, {
      idUsuario: usuario.idUsuario,
      rol: usuario.rol,
    });
  }

  @Post()
  @Roles(Rol.Usuario, Rol.Supervisor, Rol.Administrador)
  @UseInterceptors(FileInterceptor('imagen', opcionesImagen))
  crear(
    @Body() dto: CrearRetoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
    @UploadedFile() imagen?: ArchivoSubido,
  ) {
    return this.retosService.crear(dto, usuario.idUsuario, imagen);
  }

  @Put(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarRetoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.retosService.actualizar(id, dto, {
      idUsuario: usuario.idUsuario,
      rol: usuario.rol,
    });
  }

  @Post(':id/imagen')
  @UseInterceptors(FileInterceptor('imagen', opcionesImagen))
  subirImagen(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: UsuarioAutenticado,
    @UploadedFile() imagen?: ArchivoSubido,
  ) {
    if (!imagen) {
      throw new BadRequestException('Debes adjuntar la imagen del reto');
    }
    return this.retosService.subirImagen(id, imagen, {
      idUsuario: usuario.idUsuario,
      rol: usuario.rol,
    });
  }

  @Delete(':id/imagen')
  @HttpCode(HttpStatus.OK)
  eliminarImagen(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.retosService.eliminarImagen(id, {
      idUsuario: usuario.idUsuario,
      rol: usuario.rol,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  eliminar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.retosService.eliminar(id, {
      idUsuario: usuario.idUsuario,
      rol: usuario.rol,
    });
  }

  @Post(':id/participar')
  participar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('idUsuario') idUsuario: number,
  ) {
    return this.retosService.registrarParticipacion(id, idUsuario);
  }

  @Get(':id/participantes')
  listarParticipantes(@Param('id', ParseIntPipe) id: number) {
    return this.retosService.obtenerParticipantes(id);
  }
}
