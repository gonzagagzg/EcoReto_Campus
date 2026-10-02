import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { UsuarioAutenticado } from '../interfaces/usuario-autenticado.interface';
import type { Rol } from '../../modules/usuarios/entities/usuario.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const request = contexto.switchToHttp().getRequest<Request & { usuario?: UsuarioAutenticado }>();
    const rol = request.usuario?.rol;

    if (!rol || !rolesRequeridos.includes(rol)) {
      throw new ForbiddenException('No tienes permisos para acceder a este recurso');
    }

    return true;
  }
}
