import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { GustoService } from '../services/gusto.service';
import { CrearGustoDto } from '../dto/crear-gusto.dto';
import { ActualizarGustoDto } from '../dto/actualizar-gusto.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Rol } from '../../../modules/usuarios/entities/usuario.entity';
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('gustos')
@UseGuards(RolesGuard)
@Roles(Rol.Administrador)
export class GustoController {
  constructor(private readonly gustoService: GustoService) {}

  @Get()
  async listar(@Query('estado') estado?: string) {
    return this.gustoService.listar(estado);
  }

  @Get(':id')
  async buscar(@Param('id') id: number) {
    return this.gustoService.buscar(id);
  }

  @Post()
  async crear(@Body() dto: CrearGustoDto) {
    return this.gustoService.crear(dto);
  }

  @Put(':id')
  async actualizar(@Param('id') id: number, @Body() dto: ActualizarGustoDto) {
    return this.gustoService.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param('id') id: number) {
    return this.gustoService.eliminar(id);
  }
}