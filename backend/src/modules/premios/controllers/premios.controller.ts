import {
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
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ActualizarPremioDto } from '../dto/actualizar-premio.dto';
import { CanjearPremioDto } from '../dto/canjear-premio.dto';
import { CrearPremioDto } from '../dto/crear-premio.dto';
import { PremioQueryDto } from '../dto/premio-query.dto';
import { Rol } from '../../usuarios/entities/usuario.entity';
import { PremiosService } from '../services/premios.service';

@Controller('premios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PremiosController {
  constructor(private readonly premiosService: PremiosService) {}

  @Get()
  listar(@Query() query: PremioQueryDto) {
    return this.premiosService.listar(query);
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
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarPremioDto) {
    return this.premiosService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.Administrador)
  @HttpCode(HttpStatus.OK)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.premiosService.eliminar(id);
  }
}
