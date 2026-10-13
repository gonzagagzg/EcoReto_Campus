import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ImagenRotaDirective } from '../../../shared/directives/imagen-rota.directive';
import { ImagenUrlPipe } from '../../../shared/pipes/imagen-url.pipe';
import { mensajeDeError } from '../../../shared/utils/error-http';
import type { PerfilCompleto } from '../../../core/models/usuario.model';

/**
 * Edición del perfil propio. Nombre, apellido, cédula y correo quedan sólo
 * lectura a propósito: el backend los deja cambiar únicamente cuando el
 * Administrador resuelve un ticket de soporte.
 */
@Component({
  selector: 'app-editar-perfil',
  imports: [
    FormsModule,
    RouterLink,
    AlertaComponent,
    LoaderComponent,
    ImagenRotaDirective,
    ImagenUrlPipe,
  ],
  styleUrl: './editar-perfil.component.css',
  templateUrl: './editar-perfil.component.html',
})
export class EditarPerfilComponent {
  private readonly usuariosService = inject(UsuariosService);
  private readonly router = inject(Router);

  protected perfil = signal<PerfilCompleto | null>(null);
  protected cargando = signal(true);
  protected procesando = signal(false);
  protected error = signal('');
  protected exito = signal('');

  protected alias = '';
  protected carrera = '';
  protected nivelCarrera = '';
  protected centroEstudios = '';
  protected contrasena = '';

  protected foto: File | null = null;
  protected vistaPrevia: string | null = null;

  constructor() {
    this.usuariosService.perfil().subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.alias = perfil.alias;
        this.carrera = perfil.carrera ?? '';
        this.nivelCarrera = perfil.nivelCarrera ?? '';
        this.centroEstudios = perfil.centroEstudios ?? '';
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  /** Iniciales del avatar cuando todavía no hay foto. */
  protected get iniciales(): string {
    const perfil = this.perfil();
    if (!perfil) {
      return '?';
    }
    return `${perfil.nombre.charAt(0)}${perfil.apellido.charAt(0)}`.toUpperCase();
  }

  protected seleccionarFoto(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    this.liberarVistaPrevia();
    this.error.set('');

    if (!archivo) {
      this.foto = null;
      return;
    }

    if (!archivo.type.startsWith('image/')) {
      this.foto = null;
      input.value = '';
      this.error.set('La foto debe ser JPG, PNG o WebP.');
      return;
    }

    this.foto = archivo;
    this.vistaPrevia = URL.createObjectURL(archivo);
  }

  protected enviar(): void {
    if (this.contrasena && (this.contrasena.length < 8 || this.contrasena.length > 72)) {
      this.error.set('La contraseña debe tener entre 8 y 72 caracteres.');
      return;
    }

    const foto = this.foto;

    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    this.usuariosService
      .actualizarPerfil({
        alias: this.alias.trim(),
        carrera: this.carrera.trim(),
        nivelCarrera: this.nivelCarrera.trim(),
        centroEstudios: this.centroEstudios.trim(),
        ...(this.contrasena ? { contrasena: this.contrasena } : {}),
      })
      .pipe(switchMap(() => (foto ? this.usuariosService.subirFoto(foto) : of(null))))
      .subscribe({
        next: (usuario) => {
          if (usuario) {
            this.perfil.update((actual) => (actual ? { ...actual, ...usuario } : actual));
          }
          this.procesando.set(false);
          this.exito.set(usuario ? 'Perfil y foto actualizados.' : 'Perfil actualizado.');
          this.foto = null;
          this.liberarVistaPrevia();
          this.contrasena = '';
        },
        error: (err) => {
          this.procesando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  protected descartar(): void {
    void this.router.navigate(['/perfil/ver']);
  }

  private liberarVistaPrevia(): void {
    if (this.vistaPrevia) {
      URL.revokeObjectURL(this.vistaPrevia);
      this.vistaPrevia = null;
    }
  }
}
