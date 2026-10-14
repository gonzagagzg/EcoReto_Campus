import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { UsuarioAutenticado } from '../../../common/interfaces/usuario-autenticado.interface';
import { PreguntaIaDto } from '../dto/pregunta-ia.dto';
import { IaService } from '../services/ia.service';

@Controller('ia')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IaController {
  constructor(private readonly iaService: IaService) {}

  /** Dice si la IA esta activada y si el modelo local responde. */
  @Get('estado')
  estado() {
    return this.iaService.estado();
  }

  /** Pregunta a la IA local; el contexto se limita segun el rol del solicitante. */
  @Post('preguntar')
  preguntar(@Body() dto: PreguntaIaDto, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.iaService.preguntar(usuario, dto.pregunta.trim());
  }
}
