import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ParticipacionesService } from '../../../core/services/participaciones.service';
import { RetosService } from '../../../core/services/retos.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { InsigniaComponent } from '../../../shared/components/insignia/insignia.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ImagenRotaDirective } from '../../../shared/directives/imagen-rota.directive';
import { ImagenUrlPipe } from '../../../shared/pipes/imagen-url.pipe';
import { mensajeDeError } from '../../../shared/utils/error-http';
import { EstadoEvaluacion } from '../../../core/models/participacion.model';
import type { ParticipacionConDetalle } from '../../../core/models/participacion.model';
import type { PerfilCompleto } from '../../../core/models/usuario.model';
import type { RetoParticipacionActual } from '../../../core/models/reto.model';

/** Ficha personal: identidad, avatar, avance de nivel, gustos y evidencias. */
@Component({
  selector: 'app-ver-perfil',
  imports: [
    RouterLink,
    AlertaComponent,
    InsigniaComponent,
    LoaderComponent,
    ImagenRotaDirective,
    ImagenUrlPipe,
  ],
  styleUrl: './ver-perfil.component.css',
  templateUrl: './ver-perfil.component.html',
})
export class VerPerfilComponent {
  private readonly usuariosService = inject(UsuariosService);
  private readonly participacionesService = inject(ParticipacionesService);
  private readonly retosService = inject(RetosService);

  protected perfil = signal<PerfilCompleto | null>(null);
  protected evidencias = signal<ParticipacionConDetalle[]>([]);
  protected participacionesActuales = signal<RetoParticipacionActual[]>([]);
  protected verDetalle = signal<ParticipacionConDetalle | null>(null);
  protected cargando = signal(true);
  protected error = signal('');

  constructor() {
    this.usuariosService.perfil().subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });

    this.participacionesService.listarLasMiasConDetalle({ limite: 5 }).subscribe({
      next: (respuesta) => this.evidencias.set(respuesta.items),
      error: () => this.evidencias.set([]),
    });

    this.retosService.listarMisParticipaciones().subscribe({
      next: (participaciones) => this.participacionesActuales.set(participaciones),
      error: () => this.participacionesActuales.set([]),
    });
  }

  protected abrirDetalle(evidencia: ParticipacionConDetalle): void {
    this.verDetalle.set(evidencia);
  }

  protected cerrarDetalle(): void {
    this.verDetalle.set(null);
  }

  protected fechaHora(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) {
      return iso;
    }
    return fecha.toLocaleString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** Inicial del alias para el avatar cuando todavía no hay foto cargada. */
  protected get iniciales(): string {
    const perfil = this.perfil();
    if (!perfil) {
      return '?';
    }
    return perfil.alias.charAt(0).toUpperCase();
  }

  protected readonly EstadoEvaluacion = EstadoEvaluacion;

  protected get nombreCompleto(): string {
    const perfil = this.perfil();
    return perfil ? `${perfil.nombre} ${perfil.apellido}` : '';
  }

  protected fecha(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) {
      return iso;
    }
    return fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  protected fechaLimite(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) {
      return iso;
    }
    return fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
