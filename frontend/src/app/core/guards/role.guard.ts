import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import type { Rol } from '../models/usuario.model';

/**
 * Exige que la sesion este iniciada y que el rol este en `route.data.roles`.
 *
 * Uso en app.routes.ts:
 *   { path: 'admin', data: { roles: [Rol.Administrador] }, ... }
 *
 * Si la ruta no declara roles, solo se exige estar autenticado. Si el rol no
 * corresponde, manda a /inicio en vez de dejarlo en blanco.
 */
export const roleGuard: CanActivateFn = (ruta) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.autenticado() || auth.expirado()) {
    auth.cerrarSesion();

    return router.createUrlTree(['/login'], { queryParams: { returnUrl: ruta.url } });
  }

  const roles = ruta.data?.['roles'] as Rol[] | undefined;

  if (!roles || roles.length === 0) {
    return true;
  }

  const rol = auth.rol();

  if (rol && roles.includes(rol)) {
    return true;
  }

  return router.createUrlTree(['/inicio']);
};
