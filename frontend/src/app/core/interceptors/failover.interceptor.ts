import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ConfigService } from '../services/config.service';

/** Reintentos de failover ya consumidos por esta peticion (no viaja al servidor). */
export const REINTENTOS_FAILOVER = new HttpContextToken<number>(() => 0);

/** Solo estos fallos justifican probar con otro backend. */
function esFalloConmutable(error: unknown): error is HttpErrorResponse {
  return error instanceof HttpErrorResponse && (error.status === 0 || error.status >= 500);
}

/**
 * Failover automatico para lecturas: si un GET a la API falla por red
 * (status 0) o error del servidor (5xx), rota al siguiente backend de
 * `ConfigService` y reintenta. Cada respaldo se prueba una sola vez.
 *
 * Solo GET: las mutaciones (POST/PUT/PATCH/DELETE) no se reintentan porque
 * no son idempotentes (un reintento podria duplicar la operacion si la
 * primera peticion si llego al servidor). Los 4xx tampoco rotan porque son
 * errores de la peticion, no del backend.
 */
export const failoverInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(ConfigService);

  if (req.method !== 'GET') {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!esFalloConmutable(error)) {
        return throwError(() => error);
      }

      const baseActual = config.apiUrl;

      if (!req.url.startsWith(baseActual)) {
        return throwError(() => error);
      }

      const intentos = req.context.get(REINTENTOS_FAILOVER);

      if (intentos >= config.backends.length - 1) {
        return throwError(() => error);
      }

      const nuevaBase = config.siguienteBackend();

      if (!nuevaBase) {
        return throwError(() => error);
      }

      const reintento = req.clone({
        url: `${nuevaBase}${req.url.slice(baseActual.length)}`,
        context: req.context.set(REINTENTOS_FAILOVER, intentos + 1),
      });

      return next(reintento);
    }),
  );
};
