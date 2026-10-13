import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Exige sesion iniciada. Si no hay token o ya caduco, cierra la sesion y
 * devuelve al login conservando a donde iba el usuario para volver tras
 * autenticarse.
 */
export const authGuard: CanActivateFn = (_ruta, estado) => {
  const auth = inject(AuthService);

  if (auth.autenticado() && !auth.expirado()) {
    return true;
  }

  auth.cerrarSesion();

  return inject(Router).createUrlTree(['/login'], {
    queryParams: { returnUrl: estado.url },
  });
};
