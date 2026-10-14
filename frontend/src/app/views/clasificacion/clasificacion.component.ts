import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UsuariosService } from '../../core/services/usuarios.service';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { AlertaComponent } from '../../shared/components/alerta/alerta.component';
import { ImagenRotaDirective } from '../../shared/directives/imagen-rota.directive';
import { ImagenUrlPipe } from '../../shared/pipes/imagen-url.pipe';
import { mensajeDeError } from '../../shared/utils/error-http';
import type { Usuario } from '../../core/models/usuario.model';

/** Clasificación de estudiantes por puntos (excluye staff). */
@Component({
  selector: 'app-clasificacion',
  imports: [RouterLink, LoaderComponent, AlertaComponent, ImagenRotaDirective, ImagenUrlPipe],
  styleUrl: './clasificacion.component.css',
  templateUrl: './clasificacion.component.html',
})
export class ClasificacionComponent implements OnInit {
  private readonly usuariosService = inject(UsuariosService);

  protected items = signal<Usuario[]>([]);
  protected cargando = signal(true);
  protected error = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.usuariosService.topUsuarios().subscribe({
      next: (usuarios) => {
        this.items.set(usuarios);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  protected get iniciales(): (u: Usuario) => string {
    return (u) => u.alias?.charAt(0).toUpperCase() ?? '?';
  }

  protected get nombreCompleto(): (u: Usuario) => string {
    return (u) => `${u.nombre} ${u.apellido}`;
  }

  protected get carreraInfo(): (u: Usuario) => string {
    return (u) => {
      const parts = [u.carrera, u.nivelCarrera, u.centroEstudios].filter(Boolean);
      return parts.length ? parts.join(' • ') : 'Sin información';
    };
  }
}
