import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { invitadoGuard } from './core/guards/invitado.guard';
import { roleGuard } from './core/guards/role.guard';
import { Rol } from './core/models/usuario.model';

/**
 * Arbol de rutas.
 *
 * Todo lo que esta bajo '' usa MainLayoutComponent (header + sidebar +
 * router-outlet) y exige sesion iniciada. Login y registro son planos y solo
 * los ve el invitado. Los accesos de staff se restringen con roleGuard y el
 * arreglo de roles en `data`, que es lo que el sidebar usa para mostrar u
 * ocultar cada seccion.
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'EcoReto | Iniciar sesion',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./views/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    title: 'EcoReto | Registro',
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./views/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },

      {
        path: 'inicio',
        title: 'EcoReto | Inicio',
        loadComponent: () =>
          import('./views/inicio/inicio.component').then((m) => m.InicioComponent),
      },

      {
        path: 'perfil',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'ver' },
          {
            path: 'ver',
            title: 'EcoReto | Mi perfil',
            loadComponent: () =>
              import('./views/perfil/ver-perfil/ver-perfil.component').then(
                (m) => m.VerPerfilComponent,
              ),
          },
          {
            path: 'editar',
            title: 'EcoReto | Editar perfil',
            loadComponent: () =>
              import('./views/perfil/editar-perfil/editar-perfil.component').then(
                (m) => m.EditarPerfilComponent,
              ),
          },
          {
            path: 'gustos',
            title: 'EcoReto | Mis gustos',
            loadComponent: () =>
              import('./views/perfil/mis-gustos/mis-gustos.component').then(
                (m) => m.MisGustosComponent,
              ),
          },
          {
            path: ':id',
            title: 'EcoReto | Perfil',
            loadComponent: () =>
              import('./views/perfil/ver-usuario/ver-usuario.component').then(
                (m) => m.VerUsuarioComponent,
              ),
          },
        ],
      },

      {
        path: 'retos',
        children: [
          {
            path: 'crear',
            title: 'EcoReto | Crear reto',
            loadComponent: () =>
              import('./views/retos/crear-reto/crear-reto.component').then(
                (m) => m.CrearRetoComponent,
              ),
          },
          {
            path: ':id/evidencia',
            title: 'EcoReto | Subir evidencia',
            loadComponent: () =>
              import('./views/retos/subir-evidencia/subir-evidencia.component').then(
                (m) => m.SubirEvidenciaComponent,
              ),
          },
          {
            path: ':id',
            title: 'EcoReto | Reto',
            loadComponent: () =>
              import('./views/retos/detalle-reto/detalle-reto.component').then(
                (m) => m.DetalleRetoComponent,
              ),
          },
        ],
      },

      {
        path: 'premios',
        title: 'EcoReto | Premios',
        loadComponent: () =>
          import('./views/premios/premios.component').then((m) => m.PremiosComponent),
      },

      {
        path: 'clasificacion',
        title: 'EcoReto | Clasificación',
        loadComponent: () =>
          import('./views/clasificacion/clasificacion.component').then(
            (m) => m.ClasificacionComponent,
          ),
      },

      {
        path: 'soporte',
        title: 'EcoReto | Soporte',
        loadComponent: () =>
          import('./views/soporte/soporte.component').then((m) => m.SoporteComponent),
      },

      {
        path: 'supervisor',
        title: 'EcoReto | Supervision',
        canActivate: [roleGuard],
        data: { roles: [Rol.Supervisor, Rol.Administrador] },
        loadComponent: () =>
          import('./views/supervisor/supervisor.component').then((m) => m.SupervisorComponent),
      },

      {
        path: 'admin',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'resumen' },
          {
            path: 'resumen',
            title: 'EcoReto | Tablero',
            canActivate: [roleGuard],
            data: { roles: [Rol.Administrador] },
            loadComponent: () =>
              import('./views/admin/resumen-admin/resumen-admin.component').then(
                (m) => m.ResumenAdminComponent,
              ),
          },
          {
            path: 'usuarios',
            title: 'EcoReto | Gestionar usuarios',
            canActivate: [roleGuard],
            data: { roles: [Rol.Administrador] },
            loadComponent: () =>
              import('./views/admin/gestionar-usuarios/gestionar-usuarios.component').then(
                (m) => m.GestionarUsuariosComponent,
              ),
          },
          {
            path: 'retos',
            title: 'EcoReto | Gestionar retos',
            canActivate: [roleGuard],
            data: { roles: [Rol.Supervisor, Rol.Administrador] },
            loadComponent: () =>
              import('./views/admin/gestionar-retos/gestionar-retos.component').then(
                (m) => m.GestionarRetosComponent,
              ),
          },
          {
            path: 'premios',
            title: 'EcoReto | Gestionar premios',
            canActivate: [roleGuard],
            data: { roles: [Rol.Administrador] },
            loadComponent: () =>
              import('./views/admin/gestionar-premios/gestionar-premios.component').then(
                (m) => m.GestionarPremiosComponent,
              ),
          },
          {
            path: 'gustos',
            title: 'EcoReto | Gestionar gustos',
            canActivate: [roleGuard],
            data: { roles: [Rol.Administrador] },
            loadComponent: () =>
              import('./views/admin/gestionar-gustos/gestionar-gustos.component').then(
                (m) => m.GestionarGustosComponent,
              ),
          },
          {
            path: 'soporte',
            title: 'EcoReto | Soporte',
            canActivate: [roleGuard],
            data: { roles: [Rol.Administrador] },
            loadComponent: () =>
              import('./views/admin/soporte-admin/soporte-admin.component').then(
                (m) => m.SoporteAdminComponent,
              ),
          },
          {
            path: 'historial',
            title: 'EcoReto | Historial',
            canActivate: [roleGuard],
            data: { roles: [Rol.Supervisor, Rol.Administrador] },
            loadComponent: () =>
              import('./views/admin/historial-registros/historial-registros.component').then(
                (m) => m.HistorialRegistrosComponent,
              ),
          },
          {
            path: 'premios-canjeados',
            title: 'EcoReto | Premios canjeados',
            canActivate: [roleGuard],
            data: { roles: [Rol.Administrador] },
            loadComponent: () =>
              import('./views/admin/gestionar-premios-canjeados/gestionar-premios-canjeados.component').then(
                (m) => m.GestionarPremiosCanjeadosComponent,
              ),
          },
        ],
      },
    ],
  },

  { path: '**', redirectTo: 'inicio' },
];
