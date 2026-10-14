import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UsuarioAutenticado } from '../interfaces/usuario-autenticado.interface';

export const CurrentUser = createParamDecorator(
  (dato: keyof UsuarioAutenticado | undefined, contexto: ExecutionContext) => {
    const request = contexto.switchToHttp().getRequest<Request & { usuario?: UsuarioAutenticado }>();
    const usuario = request.usuario;

    if (!usuario) {
      return undefined;
    }

    return dato ? usuario[dato] : usuario;
  },
);
