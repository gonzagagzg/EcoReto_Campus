import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Observable } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ModalConfirmacionComponent } from '../../../shared/components/modal-confirmacion/modal-confirmacion.component';
import { PaginacionComponent } from '../../../shared/components/paginacion/paginacion.component';
import { mensajeDeError } from '../../../shared/utils/error-http';
import { EstadoUsuario, Rol, type Usuario } from '../../../core/models/usuario.model';
import type { ActualizarUsuario } from '../../../core/models/admin.model';

const ESTADOS: EstadoUsuario[] = [
  EstadoUsuario.Pendiente,
  EstadoUsuario.Activo,
  EstadoUsuario.Desactivo,
  EstadoUsuario.Bloqueado,
];

/**
 * Alta, baja lógica y cambio de rol de las cuentas del campus. Eliminar deja
 * la cuenta en estado `desactivo` (no puede iniciar sesión) y conserva su
 * historial; Restaurar la devuelve a `activo`.
 */
@Component({
  selector: 'app-gestionar-usuarios',
  imports: [
    FormsModule,
    AlertaComponent,
    LoaderComponent,
    ModalConfirmacionComponent,
    PaginacionComponent,
  ],
  styleUrl: './gestionar-usuarios.component.css',
  templateUrl: './gestionar-usuarios.component.html',
})
export class GestionarUsuariosComponent {
  private readonly adminService = inject(AdminService);

  protected readonly estados = ESTADOS;
  protected readonly Rol = Rol;
  protected readonly EstadoUsuario = EstadoUsuario;

  protected items = signal<Usuario[]>([]);
  protected total = signal(0);
  protected rolesDisponibles = signal<Rol[]>([]);
  protected cargando = signal(true);
  protected error = signal('');
  protected exito = signal('');

  protected busqueda = '';
  protected rol = '';
  protected estado = '';
  protected pagina = 1;
  protected readonly limite = 10;

  protected porEliminar = signal<Usuario | null>(null);
  protected editando = signal<Usuario | null>(null);
  protected formEdit: ActualizarUsuario = {};
  protected procesando = signal(false);

  constructor() {
    this.adminService.rolesDisponibles().subscribe({
      next: (roles) => this.rolesDisponibles.set(roles),
      error: () => this.rolesDisponibles.set(Object.values(Rol)),
    });

    this.cargar();
  }

  protected abrirEdicion(usuario: Usuario): void {
    this.editando.set(usuario);
    this.formEdit = {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      alias: usuario.alias,
      correo: usuario.correo,
      cedula: usuario.cedula,
      carrera: usuario.carrera ?? '',
      nivelCarrera: usuario.nivelCarrera ?? '',
      centroEstudios: usuario.centroEstudios ?? '',
      contrasena: '',
      puntos: usuario.puntos,
      historialPuntos: usuario.historialPuntos,
      retosCumplidos: usuario.retosCumplidos,
      nivel: usuario.nivel,
      estado: usuario.estado,
      rol: usuario.rol,
    };
  }

  protected cerrarEdicion(): void {
    this.editando.set(null);
    this.formEdit = {};
  }

  protected guardarEdicion(): void {
    const usuario = this.editando();
    if (!usuario) {
      return;
    }

    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    const { contrasena, ...campos } = this.formEdit;
    const datos: ActualizarUsuario = {
      ...campos,
      ...(contrasena ? { contrasena } : {}),
    };

    this.adminService
      .actualizarUsuario(usuario.idUsuario, datos)
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.exito.set(`Usuario ${usuario.alias} actualizado.`);
          this.cerrarEdicion();
          this.cargar();
        },
        error: (err) => {
          this.procesando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.adminService
      .listarUsuarios({
        pagina: this.pagina,
        limite: this.limite,
        busqueda: this.busqueda.trim() || undefined,
        rol: (this.rol as Rol) || undefined,
        estado: (this.estado as EstadoUsuario) || undefined,
      })
      .subscribe({
        next: (respuesta) => {
          this.items.set(respuesta.items);
          this.total.set(respuesta.total);
          this.cargando.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  protected buscar(): void {
    this.pagina = 1;
    this.cargar();
  }

  protected limpiar(): void {
    this.busqueda = '';
    this.rol = '';
    this.estado = '';
    this.buscar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
  }

  protected activar(usuario: Usuario): void {
    this.ejecutar(this.adminService.activar(usuario.idUsuario), usuario.alias);
  }

  protected cambiarEstado(usuario: Usuario, estado: string): void {
    const siguiente = estado as EstadoUsuario;
    if (siguiente === usuario.estado) {
      return;
    }
    this.ejecutar(
      this.adminService.cambiarEstado(usuario.idUsuario, { estado: siguiente }),
      usuario.alias,
    );
  }

  protected cambiarRol(usuario: Usuario, rol: string): void {
    const siguiente = rol as Rol;
    if (siguiente === usuario.rol) {
      return;
    }
    this.ejecutar(
      this.adminService.cambiarRol(usuario.idUsuario, { rol: siguiente }),
      usuario.alias,
    );
  }

  protected confirmarEliminacion(): void {
    const usuario = this.porEliminar();
    if (!usuario) {
      return;
    }

    this.porEliminar.set(null);
    this.ejecutar(
      this.adminService.eliminar(usuario.idUsuario),
      usuario.alias,
      `Cuenta de ${usuario.alias} desactivada.`,
    );
  }

  protected cancelarEliminacion(): void {
    this.porEliminar.set(null);
  }

  /** Baja lógica al revés: la cuenta vuelve a poder iniciar sesión. */
  protected restaurar(usuario: Usuario): void {
    this.ejecutar(
      this.adminService.cambiarEstado(usuario.idUsuario, { estado: EstadoUsuario.Activo }),
      usuario.alias,
      `Cuenta de ${usuario.alias} restaurada.`,
    );
  }

  private ejecutar<T>(operacion: Observable<T>, alias: string, mensaje?: string): void {
    this.error.set('');
    this.exito.set('');

    operacion.subscribe({
      next: () => {
        this.exito.set(mensaje ?? `Cuenta de ${alias} actualizada.`);
        this.cargar();
      },
      error: (err) => this.error.set(mensajeDeError(err)),
    });
  }
}
