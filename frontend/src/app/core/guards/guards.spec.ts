import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';
import { invitadoGuard } from './invitado.guard';
import { AuthService, LLAVE_ACCESS } from '../services/auth.service';
import { Rol } from '../models/usuario.model';

function tokenFalso(datos: Record<string, unknown>): string {
  const parte = (valor: object) => btoa(JSON.stringify(valor)).replace(/=+$/, '');

  return `${parte({ alg: 'none' })}.${parte(datos)}.firma`;
}

function tokenValido(rol: Rol): string {
  return tokenFalso({
    sub: 4,
    correo: 'luis@ecoreto.campus',
    alias: 'luis',
    rol,
    tipo: 'access',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

function tokenVencido(): string {
  return tokenFalso({
    sub: 4,
    correo: 'luis@ecoreto.campus',
    alias: 'luis',
    rol: Rol.Usuario,
    tipo: 'access',
    exp: Math.floor(Date.now() / 1000) - 60,
  });
}

/** Los guards usan inject(), asi que hay que correrlos en un contexto de inyeccion. */
function correr(guard: typeof authGuard, ruta: ActivatedRouteSnapshot) {
  const estado = { url: '/interno' } as RouterStateSnapshot;

  return TestBed.runInInjectionContext(() => guard(ruta, estado));
}

function ruta(data?: Record<string, unknown>): ActivatedRouteSnapshot {
  return { data: data ?? {} } as ActivatedRouteSnapshot;
}

describe('guards', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('authGuard', () => {
    it('permite el paso cuando hay un token vigente', () => {
      localStorage.setItem(LLAVE_ACCESS, tokenValido(Rol.Usuario));

      expect(correr(authGuard, ruta())).toBe(true);
    });

    it('manda al login conservando la url de destino cuando no hay sesion', () => {
      const destino = correr(authGuard, ruta());

      expect(destino).toBeInstanceOf(UrlTree);
      expect((destino as UrlTree).toString()).toContain('returnUrl=%2Finterno');
    });

    it('cierra la sesion y manda al login cuando el token vencio', () => {
      localStorage.setItem(LLAVE_ACCESS, tokenVencido());

      const destino = correr(authGuard, ruta());

      expect(destino).toBeInstanceOf(UrlTree);
      expect(localStorage.getItem(LLAVE_ACCESS)).toBeNull();
    });
  });

  describe('roleGuard', () => {
    it('autoriza si el rol de la sesion esta en data.roles', () => {
      localStorage.setItem(LLAVE_ACCESS, tokenValido(Rol.Administrador));

      const destino = correr(roleGuard, ruta({ roles: [Rol.Administrador] }));

      expect(destino).toBe(true);
    });

    it('rechaza y manda al inicio cuando el rol no corresponde', () => {
      localStorage.setItem(LLAVE_ACCESS, tokenValido(Rol.Usuario));

      const destino = correr(roleGuard, ruta({ roles: [Rol.Administrador] }));

      expect(destino).toBeInstanceOf(UrlTree);
      expect((destino as UrlTree).toString()).toContain('/inicio');
    });

    it('solo exige estar autenticado si la ruta no declara roles', () => {
      localStorage.setItem(LLAVE_ACCESS, tokenValido(Rol.Usuario));

      expect(correr(roleGuard, ruta())).toBe(true);
    });
  });

  describe('invitadoGuard', () => {
    it('deja pasar a un visitante sin sesion', () => {
      expect(correr(invitadoGuard, ruta())).toBe(true);
    });

    it('aleja del login a quien ya tiene sesion', () => {
      localStorage.setItem(LLAVE_ACCESS, tokenValido(Rol.Usuario));

      const destino = correr(invitadoGuard, ruta());

      expect(destino).toBeInstanceOf(UrlTree);
      expect((destino as UrlTree).toString()).toContain('/inicio');
    });
  });

  describe('AuthService', () => {
    it('decodifica el rol y el alias al iniciar sesion', () => {
      localStorage.setItem(LLAVE_ACCESS, tokenValido(Rol.Supervisor));

      const auth = TestBed.inject(AuthService);

      expect(auth.autenticado()).toBe(true);
      expect(auth.rol()).toBe(Rol.Supervisor);
      expect(auth.alias()).toBe('luis');
      expect(auth.idUsuario()).toBe(4);
    });

    it('no se considera autenticado con un token corrupto', () => {
      localStorage.setItem(LLAVE_ACCESS, 'no-es-un-jwt');

      const auth = TestBed.inject(AuthService);

      expect(auth.autenticado()).toBe(false);
      expect(localStorage.getItem(LLAVE_ACCESS)).toBeNull();
    });

    it('esStaff solo para Supervisor y Administrador', () => {
      localStorage.setItem(LLAVE_ACCESS, tokenValido(Rol.Usuario));

      expect(TestBed.inject(AuthService).esStaff()).toBe(false);
    });
  });
});
