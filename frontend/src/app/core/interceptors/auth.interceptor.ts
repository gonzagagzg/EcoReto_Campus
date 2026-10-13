import { HttpInterceptorFn } from '@angular/common/http';
import { LLAVE_ACCESS } from '../services/auth.service';

/**
 * Adjunta el access token a cada peticion saliente.
 *
 * Lee el almacenamiento directamente en vez de inyectar AuthService para no
 * formar un ciclo con HttpClient (AuthService depende de ApiService, que
 * depende de HttpClient). Los 401 se resuelven en el llamador o con la
 * caducidad que AuthService ya calcula en `expirado()`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(LLAVE_ACCESS);

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
