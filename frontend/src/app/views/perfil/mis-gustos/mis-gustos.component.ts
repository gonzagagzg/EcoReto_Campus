import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ImagenRotaDirective } from '../../../shared/directives/imagen-rota.directive';
import { ImagenUrlPipe } from '../../../shared/pipes/imagen-url.pipe';
import { mensajeDeError } from '../../../shared/utils/error-http';
import type { Gusto } from '../../../core/models/gusto.model';

/**
 * Selección de intereses. El backend no agrega ni quita de a uno: guarda la
 * lista entera, por eso la vista mantiene la selección en memoria y solo
 * manda PUT al guardar.
 */
@Component({
  selector: 'app-mis-gustos',
  imports: [RouterLink, AlertaComponent, LoaderComponent, ImagenRotaDirective, ImagenUrlPipe],
  styleUrl: './mis-gustos.component.css',
  templateUrl: './mis-gustos.component.html',
})
export class MisGustosComponent {
  private readonly auth = inject(AuthService);
  private readonly usuariosService = inject(UsuariosService);

  protected catalogo = signal<Gusto[]>([]);
  protected seleccion = signal<Set<number>>(new Set());
  protected seleccionInicial = new Set<number>();

  protected cargando = signal(true);
  protected procesando = signal(false);
  protected error = signal('');
  protected exito = signal('');

  constructor() {
    const idUsuario = this.auth.idUsuario();
    if (idUsuario === null) {
      this.cargando.set(false);
      this.error.set('No pudimos identificar tu cuenta. Volvé a iniciar sesión.');
      return;
    }

    this.usuariosService.catalogoGustos().subscribe({
      next: (gustos) => this.catalogo.set(gustos),
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });

    this.usuariosService.gustosDe(idUsuario).subscribe({
      next: (gustos) => {
        this.seleccion.set(new Set(gustos.map((g) => g.idGusto)));
        this.seleccionInicial = new Set(this.seleccion());
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  protected alternar(idGusto: number): void {
    this.exito.set('');
    this.seleccion.update((actual) => {
      const copia = new Set(actual);
      if (copia.has(idGusto)) {
        copia.delete(idGusto);
      } else {
        copia.add(idGusto);
      }
      return copia;
    });
  }

  protected get sinCambios(): boolean {
    const actual = [...this.seleccion()].sort().join(',');
    const inicial = [...this.seleccionInicial].sort().join(',');
    return actual === inicial;
  }

  protected get cantidad(): number {
    return this.seleccion().size;
  }

  protected guardar(): void {
    const idUsuario = this.auth.idUsuario();
    if (idUsuario === null) {
      this.error.set('No pudimos identificar tu cuenta.');
      return;
    }

    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    this.usuariosService.guardarGustos(idUsuario, { idsGustos: [...this.seleccion()] }).subscribe({
      next: (gustos) => {
        this.seleccionInicial = new Set(gustos.map((g) => g.idGusto));
        this.procesando.set(false);
        this.exito.set('Tus intereses quedaron guardados.');
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }
}
