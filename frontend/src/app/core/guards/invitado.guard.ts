import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protege /login y /registro de usuarios que ya tienen sesion: si ya hay
 * token vigente los manda al inicio.
 */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);

  if (auth.autenticado() && !auth.expirado()) {
    return inject(Router).createUrlTree(['/inicio']);
  }

  return true;
};
