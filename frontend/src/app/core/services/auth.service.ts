import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ApiService } from './api.service';
import type { Login, PayloadToken, Registro, RegistroExitoso, Sesion } from '../models/auth.model';
import { Rol } from '../models/usuario.model';

/**
 * Llaves de localStorage. Se exportan para que el interceptor las use leyendo
 * el almacenamiento directamente, sin inyectar este servicio dentro de la
 * cadena de HttpClient (evita la dependencia circular con ApiService).
 */
export const LLAVE_ACCESS = 'ecoreto.accessToken';
const LLAVE_REFRESH = 'ecoreto.refreshToken';

/**
 * Sesion de la aplicacion: guarda los tokens en localStorage y expone el
 * usuario actual como signals para que los guards, el header y el sidebar
 * reaccionen a los cambios sin recargar la pagina.
 *
 * GET /gg/auth/login y /gg/auth/refresh devuelven { accessToken, refreshToken, alias }.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  private readonly _alias = signal<string | null>(null);
  private readonly _payload = signal<PayloadToken | null>(null);

  /** true si hay un access token guardado y no expiro. */
  readonly autenticado = computed(() => this._payload() !== null);
  readonly alias = this._alias.asReadonly();
  readonly rol = computed<Rol | null>(() => (this._payload()?.rol as Rol) ?? null);
  readonly idUsuario = computed<number | null>(() => this._payload()?.sub ?? null);

  /** Si el token expiro se limpia la sesion y el guard lo mandara al login. */
  readonly expirado = computed(() => {
    const payload = this._payload();
    if (!payload) {
      return false;
    }
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  });

  constructor() {
    this.cargarSesion();
  }

  iniciarSesion(datos: Login): Observable<Sesion> {
    return this.api
      .post<Sesion>('auth/login', datos)
      .pipe(tap((sesion) => this.guardarSesion(sesion)));
  }

  registrar(datos: Registro): Observable<RegistroExitoso> {
    return this.api.post<RegistroExitoso>('auth/registro', datos);
  }

  refrescar(): Observable<Sesion> {
    const refreshToken = this.leer(LLAVE_REFRESH);
    if (!refreshToken) {
      throw new Error('No hay refresh token guardado');
    }
    return this.api
      .post<Sesion>('auth/refresh', { refreshToken })
      .pipe(tap((sesion) => this.guardarSesion(sesion)));
  }

  cerrarSesion(): void {
    localStorage.removeItem(LLAVE_ACCESS);
    localStorage.removeItem(LLAVE_REFRESH);
    this._alias.set(null);
    this._payload.set(null);
  }

  /** Rutas con [data.roles] de estas solo las ve el staff. */
  esStaff(): boolean {
    const rol = this.rol();
    return rol === Rol.Supervisor || rol === Rol.Administrador;
  }

  private guardarSesion(sesion: Sesion): void {
    localStorage.setItem(LLAVE_ACCESS, sesion.accessToken);
    localStorage.setItem(LLAVE_REFRESH, sesion.refreshToken);
    this._alias.set(sesion.alias);
    this._payload.set(decodificarPayload(sesion.accessToken));
  }

  private cargarSesion(): void {
    const token = this.leer(LLAVE_ACCESS);
    if (!token) {
      return;
    }
    const payload = decodificarPayload(token);
    if (!payload) {
      this.cerrarSesion();
      return;
    }
    this._alias.set(payload.alias);
    this._payload.set(payload);
  }

  private leer(llave: string): string | null {
    return localStorage.getItem(llave);
  }
}

/** Lee el payload del JWT sin verificar la firma (solo para mostrar la UI). */
function decodificarPayload(token: string): PayloadToken | null {
  try {
    const parte = token.split('.')[1];
    if (!parte) {
      return null;
    }
    const base64 = parte.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as PayloadToken;
  } catch {
    return null;
  }
}
