import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

/**
 * Cuerpo de peticion. Se deja en `object` para poder enviar directamente
 * cualquier interface de `core/models` sin tener que hacer spread.
 */
type Cuerpo = object;

/**
 * Parametros de consulta. Se permiten `undefined` para que las interfaces
 * opcionales de `core/models` se puedan pasar sin filtrarlas antes; los
 * vacios o indefinidos se descartan al armar la URL.
 */
type Consulta = { [param: string]: string | number | boolean | undefined };

/**
 * Cliente HTTP base para consumir la API del backend.
 *
 * Todas las rutas quedan bajo ConfigService.apiUrl (resuelto en runtime desde
 * config.json, con respaldo en environment.ts), asi que solo se pasa el
 * recurso: `api.get('retos')` -> GET .../gg/retos
 *
 * Las demas clases de servicios inyectan esta en vez de HttpClient para
 * concentrar la url base, los headers y el manejo de errores en un lugar.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  get<T>(ruta: string, consulta?: Consulta): Observable<T> {
    return this.http.get<T>(this.url(ruta), { params: this.parametros(consulta) });
  }

  post<T>(ruta: string, cuerpo: Cuerpo): Observable<T> {
    return this.http.post<T>(this.url(ruta), cuerpo);
  }

  put<T>(ruta: string, cuerpo: Cuerpo): Observable<T> {
    return this.http.put<T>(this.url(ruta), cuerpo);
  }

  patch<T>(ruta: string, cuerpo: Cuerpo): Observable<T> {
    return this.http.patch<T>(this.url(ruta), cuerpo);
  }

  delete<T>(ruta: string): Observable<T> {
    return this.http.delete<T>(this.url(ruta));
  }

  /** POST con FormData (para subida de archivos). No setea Content-Type; lo hace el navegador. */
  postFormData<T>(ruta: string, formData: FormData): Observable<T> {
    return this.http.post<T>(this.url(ruta), formData);
  }

  /** Construye la url final, evita duplicar barras y deja la raiz sin barra final. */
  private url(ruta: string): string {
    const limpia = ruta.replace(/^\/+/, '');
    const base = this.config.apiUrl;

    return limpia ? `${base}/${limpia}` : base;
  }

  private parametros(consulta?: Consulta): HttpParams {
    let params = new HttpParams();

    if (!consulta) {
      return params;
    }

    for (const [clave, valor] of Object.entries(consulta)) {
      if (valor === undefined || valor === '') {
        continue;
      }
      params = params.set(clave, valor);
    }

    return params;
  }
}
