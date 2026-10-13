import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { ParticipacionesService } from '../../../core/services/participaciones.service';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { InsigniaComponent } from '../../../shared/components/insignia/insignia.component';
import { ImagenRotaDirective } from '../../../shared/directives/imagen-rota.directive';
import { ImagenUrlPipe } from '../../../shared/pipes/imagen-url.pipe';
import { mensajeDeError } from '../../../shared/utils/error-http';
import { RetosService } from '../../../core/services/retos.service';
import type { PerfilPublico } from '../../../core/models/usuario.model';
import type { Reto } from '../../../core/models/reto.model';

/** Perfil público de otro usuario: identidad, avatar, avance y retos recientes. */
@Component({
  selector: 'app-ver-usuario',
  imports: [
    RouterLink,
    LoaderComponent,
    AlertaComponent,
    InsigniaComponent,
    ImagenRotaDirective,
    ImagenUrlPipe,
  ],
  styleUrl: './ver-usuario.component.css',
  templateUrl: './ver-usuario.component.html',
})
export class VerUsuarioComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly usuariosService = inject(UsuariosService);
  private readonly participacionesService = inject(ParticipacionesService);
  private readonly retosService = inject(RetosService);

  protected perfil = signal<PerfilPublico | null>(null);
  protected retosRecientes = signal<Reto[]>([]);
  protected cargando = signal(true);
  protected error = signal('');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.cargando.set(false);
      this.error.set('Usuario no válido');
      return;
    }
    this.cargar(id);
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.error.set('');

    this.usuariosService.obtener(id).subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.cargarRetosRecientes(id);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  private cargarRetosRecientes(idUsuario: number): void {
    this.participacionesService.listarAprobadosPublicos(idUsuario).subscribe({
      next: async (participaciones) => {
        const retos: Reto[] = [];
        for (const p of participaciones) {
          try {
            const reto = await this.retosService.obtener(p.idReto).toPromise();
            if (reto) {
              retos.push(reto);
            }
          } catch {
            // Ignorar retos que no se puedan cargar
          }
        }
        this.retosRecientes.set(retos);
      },
      error: () => {
        // Silencioso: si falla simplemente no se muestran
      },
    });
  }

  /** Inicial del alias para el avatar cuando no hay foto. */
  protected get iniciales(): string {
    const p = this.perfil();
    return p?.alias?.charAt(0).toUpperCase() ?? '?';
  }

  protected get nombreCompleto(): string {
    const p = this.perfil();
    return p ? `${p.nombre} ${p.apellido}` : '';
  }

  protected fecha(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
