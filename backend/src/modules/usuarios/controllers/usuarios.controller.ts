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
import { opcionesImagen } from '../../../config/uploads.multer';
import { ActualizarGustoDto } from '../dto/actualizar-gusto.dto';
import { ActualizarPerfilDto } from '../dto/actualizar-perfil.dto';
import { ActualizarUsuarioDto } from '../dto/actualizar-usuario.dto';
import { CambiarEstadoUsuarioDto } from '../dto/cambiar-estado-usuario.dto';
import { CrearGustoDto } from '../dto/crear-gusto.dto';
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

  /** Top de estudiantes por puntos; no incluye supervisores ni administradores. */
  @Get('top')
  topUsuarios() {
    return this.usuariosService.topUsuarios(20);
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

  /** Catálogo de gustos para admin (con filtros y paginación). */
  @Get('gustos/admin')
  @Roles(Rol.Administrador)
  listarGustosAdmin(@Query() query: UsuarioQueryDto) {
    return this.usuariosService.listarGustosAdmin(query);
  }

  /** Obtiene un gusto por ID (admin). */
  @Get('gustos/:id')
  @Roles(Rol.Administrador)
  obtenerGusto(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.obtenerGusto(id);
  }

  /** Crea un nuevo gusto (admin). */
  @Post('gustos')
  @Roles(Rol.Administrador)
  crearGusto(@Body() dto: CrearGustoDto) {
    return this.usuariosService.crearGusto(dto);
  }

  /** Actualiza un gusto existente (admin). */
  @Put('gustos/:id')
  @Roles(Rol.Administrador)
  actualizarGusto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarGustoDto,
  ) {
    return this.usuariosService.actualizarGusto(id, dto);
  }

  /** Elimina (baja lógica) un gusto (admin). */
  @Delete('gustos/:id')
  @Roles(Rol.Administrador)
  @HttpCode(HttpStatus.OK)
  eliminarGusto(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.eliminarGusto(id);
  }

  /** Sube la imagen del gusto (admin). */
  @Post('gustos/:id/imagen')
  @Roles(Rol.Administrador)
  @UseInterceptors(FileInterceptor('imagen', opcionesImagen))
  async subirImagenGusto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() imagen?: ArchivoSubido,
  ) {
    if (!imagen) {
      throw new BadRequestException('Debes adjuntar la imagen del gusto');
    }
    const ruta = await this.usuariosService.subirImagenGusto(id, imagen);
    return { imagenGusto: ruta };
  }

  /** Elimina la imagen del gusto (admin). */
  @Delete('gustos/:id/imagen')
  @Roles(Rol.Administrador)
  @HttpCode(HttpStatus.OK)
  async eliminarImagenGusto(@Param('id', ParseIntPipe) id: number) {
    await this.usuariosService.eliminarImagenGusto(id);
    return { eliminado: true };
  }
}
