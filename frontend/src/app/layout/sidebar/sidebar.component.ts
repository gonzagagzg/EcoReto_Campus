import { Component, computed, inject, input, Output, EventEmitter } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Rol } from '../../core/models/usuario.model';

interface Enlace {
  ruta: string;
  etiqueta: string;
  /** Path SVG (viewBox 24x24, trazo) que representa el enlace. */
  icono: string;
  /** Si no se indica, lo ve cualquier sesion autenticada. */
  roles?: Rol[];
  /** Encabezado que agrupa este enlace con los siguientes del mismo grupo. */
  grupo?: string;
}

const ENLACES: Enlace[] = [
  {
    ruta: '/inicio',
    etiqueta: 'Inicio',
    icono: 'M3 10.5 12 3l9 7.5M5 9.3V21h14V9.3M9.5 21v-6h5v6',
  },
  {
    ruta: '/retos/crear',
    etiqueta: 'Crear reto',
    icono:
      'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9zM12 11v6M9 14h6',
  },
  {
    ruta: '/premios',
    etiqueta: 'Premios',
    icono:
      'M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
  },
  {
    ruta: '/clasificacion',
    etiqueta: 'Clasificación',
    icono: 'M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.5 13.5 7 22l5-3 5 3-1.5-8.5',
  },
  {
    ruta: '/perfil/ver',
    etiqueta: 'Mi perfil',
    icono: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  },
  {
    ruta: '/soporte',
    etiqueta: 'Soporte',
    icono:
      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.2 9.2a3 3 0 0 1 5.8 1c0 2-2.9 2.5-2.9 4M12 17.5h.01',
  },
  {
    ruta: '/supervisor',
    etiqueta: 'Panel de supervision',
    grupo: 'Supervisión',
    roles: [Rol.Supervisor, Rol.Administrador],
    icono: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  },
  {
    ruta: '/admin/retos',
    etiqueta: 'Gestionar retos',
    roles: [Rol.Supervisor, Rol.Administrador],
    icono: 'M9 6h11M9 12h11M9 18h11M4.5 5.5l1 1 2-2M4.5 11.5l1 1 2-2M4.5 17.5l1 1 2-2',
  },
  {
    ruta: '/admin/historial',
    etiqueta: 'Gestionar Evidencias',
    roles: [Rol.Supervisor, Rol.Administrador],
    icono: 'M3 3h18v18H3zM8.5 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
  },
  {
    ruta: '/admin/resumen',
    etiqueta: 'Tablero',
    grupo: 'Administración',
    roles: [Rol.Administrador],
    icono: 'M3 3h7.5v7.5H3zM13.5 3H21v7.5h-7.5zM13.5 13.5H21V21h-7.5zM3 13.5h7.5V21H3z',
  },
  {
    ruta: '/admin/usuarios',
    etiqueta: 'Gestión Usuarios',
    roles: [Rol.Administrador],
    icono:
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  },
  {
    ruta: '/admin/premios',
    etiqueta: 'Gestión Premios',
    roles: [Rol.Administrador],
    icono:
      'M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
  },
  {
    ruta: '/admin/premios-canjeados',
    etiqueta: 'Gestión Canjeos',
    roles: [Rol.Administrador],
    icono:
      'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7l8.7 5 8.7-5M12 22V12',
  },
  {
    ruta: '/admin/gustos',
    etiqueta: 'Gestión Gustos',
    roles: [Rol.Administrador],
    icono:
      'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.8 1.1-1.1a5.5 5.5 0 0 0 0-7.8z',
  },
  {
    ruta: '/admin/soporte',
    etiqueta: 'Gestión Soporte',
    roles: [Rol.Administrador],
    icono:
      'M21 11.5a8.4 8.4 0 0 1-9 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.2a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5h.5a8.5 8.5 0 0 1 8 8v.5z',
  },
];

/** Elemento ya resuelto para la plantilla: un encabezado o un enlace. */
type ItemNavegacion = { tipo: 'titulo'; titulo: string } | { tipo: 'enlace'; enlace: Enlace };

/**
 * Navegacion lateral. Oculta las secciones cuyo rol no coincide con la
 * sesion, usando la misma regla que roleGuard en app.routes.ts, de modo que
 * no se muestre un acceso que la ruta rechazaria.
 */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  styleUrl: './sidebar.component.css',
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  readonly abierto = input<boolean>(false);
  @Output() navegar = new EventEmitter<void>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly items = computed<ItemNavegacion[]>(() => {
    const rol = this.auth.rol();
    const visibles = ENLACES.filter(
      (enlace) => !enlace.roles || (rol !== null && enlace.roles.includes(rol)),
    );

    return visibles.map((enlace, indice) => {
      const anterior = visibles[indice - 1];
      const grupo = enlace.grupo;
      const encabezado = grupo && (!anterior || anterior.grupo !== grupo) ? grupo : null;

      return encabezado ? { tipo: 'titulo', titulo: encabezado } : { tipo: 'enlace', enlace };
    });
  });

  onNavegar() {
    this.navegar.emit();
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigate(['/login']);
    this.navegar.emit(); // Cierra el sidebar
  }
}
