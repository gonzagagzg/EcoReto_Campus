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
import { opcionesImagen } from '../../../config/uploads.multer';
import { ActualizarPremioDto } from '../dto/actualizar-premio.dto';
import { CanjearPremioDto } from '../dto/canjear-premio.dto';
import { CrearPremioDto } from '../dto/crear-premio.dto';
import { PremioQueryDto } from '../dto/premio-query.dto';
import { Rol } from '../../usuarios/entities/usuario.entity';
import type { Solicitud } from '../../usuarios/services/usuarios.service';
import { PremiosService } from '../services/premios.service';

@Controller('premios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PremiosController {
  constructor(private readonly premiosService: PremiosService) {}

  @Get()
  catalogo(@Query() query: PremioQueryDto) {
    return this.premiosService.listarCatalogo(query);
  }

  @Get('admin')
  @Roles(Rol.Administrador)
  listarAdmin(
    @Query() query: PremioQueryDto,
    @CurrentUser() solicitante?: Solicitud,
  ) {
    return this.premiosService.listarAdmin(query, solicitante);
  }

  @Get('mi-historial')
  historial(@CurrentUser('idUsuario') idUsuario: number) {
    return this.premiosService.historial(idUsuario);
  }

  @Post('canjear')
  canjear(
    @Body() dto: CanjearPremioDto,
    @CurrentUser('idUsuario') idUsuario: number,
  ) {
    return this.premiosService.canjear(idUsuario, dto);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.premiosService.obtener(id);
  }

  @Post()
  @Roles(Rol.Administrador)
  crear(@Body() dto: CrearPremioDto) {
    return this.premiosService.crear(dto);
  }

  @Put(':id')
  @Roles(Rol.Administrador)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPremioDto,
  ) {
    return this.premiosService.actualizar(id, dto);
  }

  @Post(':id/imagen')
  @Roles(Rol.Administrador)
  @UseInterceptors(FileInterceptor('imagen', opcionesImagen))
  async subirImagen(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() imagen?: ArchivoSubido,
  ) {
    if (!imagen) {
      throw new BadRequestException('Debes adjuntar la imagen del premio');
    }
    const ruta = await this.premiosService.subirImagen(id, imagen);
    return { imagenPremio: ruta };
  }

  @Delete(':id/imagen')
  @Roles(Rol.Administrador)
  @HttpCode(HttpStatus.OK)
  async eliminarImagen(@Param('id', ParseIntPipe) id: number) {
    await this.premiosService.eliminarImagen(id);
    return { eliminado: true };
  }

  @Delete(':id')
  @Roles(Rol.Administrador)
  @HttpCode(HttpStatus.OK)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.premiosService.eliminar(id);
  }
}
