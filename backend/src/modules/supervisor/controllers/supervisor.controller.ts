import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Rol } from '../../usuarios/entities/usuario.entity';
import { DecisionRetoDto } from '../dto/decision-reto.dto';
import { RevisionEvidenciaDto } from '../dto/revision-evidencia.dto';
import { SupervisionQueryDto } from '../dto/supervision-query.dto';
import { SupervisorService } from '../services/supervisor.service';

@Controller('supervisor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.Supervisor, Rol.Administrador)
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorService) {}

  @Get('panel')
  panel() {
    return this.supervisorService.panel();
  }

  @Get('retos-pendientes')
  retosPendientes(@Query() query: SupervisionQueryDto) {
    return this.supervisorService.listarRetosPendientes(query);
  }

  @Post('retos/:id/decision')
  decidirReto(@Param('id', ParseIntPipe) id: number, @Body() dto: DecisionRetoDto) {
    return this.supervisorService.decidirReto(id, dto);
  }

  @Get('evidencias')
  colaEvidencias(@Query() query: SupervisionQueryDto) {
    return this.supervisorService.colaEvidencias(query);
  }

  @Post('evidencias/:id/revision')
  revisarEvidencia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RevisionEvidenciaDto,
    @CurrentUser('idUsuario') idUsuarioRevisor: number,
  ) {
    return this.supervisorService.revisarEvidencia(id, dto, idUsuarioRevisor);
  }

  @Get('usuarios-pendientes')
  usuariosPendientes(@Query() query: SupervisionQueryDto) {
    return this.supervisorService.listarUsuariosPendientes(query);
  }
}
