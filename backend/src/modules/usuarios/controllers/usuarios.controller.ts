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
  Patch,
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
import { opcionesImagen } from '../../../config/uploads.multer';
import { ActualizarPerfilDto } from '../dto/actualizar-perfil.dto';
import { ActualizarUsuarioDto } from '../dto/actualizar-usuario.dto';
import { CambiarEstadoUsuarioDto } from '../dto/cambiar-estado-usuario.dto';
import { GustosUsuarioDto } from '../dto/gustos-usuario.dto';
import { UsuarioQueryDto } from '../dto/usuario-query.dto';
import { Rol } from '../entities/usuario.entity';
import type { Solicitud } from '../services/usuarios.service';
import { UsuariosService } from '../services/usuarios.service';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  listar(@Query() query: UsuarioQueryDto, @CurrentUser() solicitante: Solicitud) {
    return this.usuariosService.listar(query, solicitante);
  }

  @Get('perfil')
  perfil(@CurrentUser('idUsuario') idUsuario: number) {
    return this.usuariosService.perfil(idUsuario);
  }

  @Put('perfil/foto')
  @UseInterceptors(FileInterceptor('foto', opcionesImagen))
  actualizarFoto(
    @CurrentUser('idUsuario') idUsuario: number,
    @UploadedFile() foto?: ArchivoSubido,
  ) {
    if (!foto) {
      throw new BadRequestException('Debes adjuntar la imagen de perfil');
    }

    return this.usuariosService.actualizarFoto(idUsuario, foto);
  }

  @Put('perfil')
  actualizarPerfil(
    @CurrentUser('idUsuario') idUsuario: number,
    @Body() dto: ActualizarPerfilDto,
  ) {
    return this.usuariosService.actualizarPerfil(idUsuario, dto);
  }

  /** Catalogo de gustos disponibles para que el estudiante elija los suyos. */
  @Get('gustos')
  catalogoGustos() {
    return this.usuariosService.listarCatalogoGustos();
  }

  @Get(':id/gustos')
  listarGustos(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() solicitante: Solicitud,
  ) {
    return this.usuariosService.listarGustos(id, solicitante);
  }

  @Put(':id/gustos')
  actualizarGustos(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GustosUsuarioDto,
    @CurrentUser() solicitante: Solicitud,
  ) {
    return this.usuariosService.actualizarGustos(id, dto, solicitante);
  }

  @Get(':id')
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() solicitante: Solicitud,
  ) {
    return this.usuariosService.perfilPublico(id, solicitante);
  }

  @Put(':id')
  @Roles(Rol.Administrador)
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarUsuarioDto) {
    return this.usuariosService.actualizar(id, dto);
  }

  @Patch(':id/estado')
  @Roles(Rol.Administrador)
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoUsuarioDto,
  ) {
    return this.usuariosService.cambiarEstado(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.Administrador)
  @HttpCode(HttpStatus.OK)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.eliminar(id);
  }
}
