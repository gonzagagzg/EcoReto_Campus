import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { TokenPayload, UsuarioAutenticado } from '../interfaces/usuario-autenticado.interface';
import { jwtConfig } from '../../config/jwt.config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const esPublico = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);

    if (esPublico) {
      return true;
    }

    const request = contexto.switchToHttp().getRequest<Request>();
    const token = this.extraerToken(request);

    if (!token) {
      throw new UnauthorizedException('Token de acceso requerido');
    }

    const env = jwtConfig();
    const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
      secret: env.secret,
    });

    if (payload.tipo !== 'access') {
      throw new UnauthorizedException('Token invalido para esta operacion');
    }

    const usuario: UsuarioAutenticado = {
      idUsuario: payload.sub,
      correo: payload.correo,
      alias: payload.alias,
      rol: payload.rol,
      estado: 'activo',
    };

    (request as Request & { usuario?: UsuarioAutenticado }).usuario = usuario;

    return true;
  }

  private extraerToken(request: Request): string | undefined {
    const encabezado = request.headers.authorization;

    if (!encabezado) {
      return undefined;
    }

    const [esquema, token] = encabezado.split(' ');

    return esquema?.toLowerCase() === 'bearer' ? token : undefined;
  }
}
