import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PremiosService } from '../../core/services/premios.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { AlertaComponent } from '../../shared/components/alerta/alerta.component';
import { InsigniaComponent } from '../../shared/components/insignia/insignia.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { PaginacionComponent } from '../../shared/components/paginacion/paginacion.component';
import { ModalConfirmacionComponent } from '../../shared/components/modal-confirmacion/modal-confirmacion.component';
import { ImagenRotaDirective } from '../../shared/directives/imagen-rota.directive';
import { ImagenUrlPipe } from '../../shared/pipes/imagen-url.pipe';
import { mensajeDeError } from '../../shared/utils/error-http';
import type { HistorialPremio, Premio } from '../../core/models/premio.model';

/**
 * Catálogo de premios canjeables. El canje descuenta los puntos en el
 * servidor, así que el botón se habilita solo con los puntos suficientes y
 * el backend es quien valida de nuevo.
 */
@Component({
  selector: 'app-premios',
  imports: [
    FormsModule,
    AlertaComponent,
    InsigniaComponent,
    LoaderComponent,
    PaginacionComponent,
    ModalConfirmacionComponent,
    ImagenRotaDirective,
    ImagenUrlPipe,
  ],
  styleUrl: './premios.component.css',
  templateUrl: './premios.component.html',
})
export class PremiosComponent {
  private readonly premiosService = inject(PremiosService);
  private readonly usuariosService = inject(UsuariosService);

  protected items = signal<Premio[]>([]);
  protected historial = signal<HistorialPremio[]>([]);
  protected puntos = signal(0);
  protected total = signal(0);
  protected cargando = signal(true);
  protected error = signal('');
  protected exito = signal('');
  protected canjeando = signal<number | null>(null);
  protected porCanjear = signal<Premio | null>(null);
  protected verDetalle = signal<HistorialPremio | null>(null);

  protected busqueda = '';
  protected pagina = 1;
  protected readonly limite = 6;

  constructor() {
    this.cargarPerfil();
    this.cargar();
    this.premiosService.historial().subscribe({
      next: (registros) => this.historial.set(registros),
      error: () => this.historial.set([]),
    });
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.premiosService
      .listarCatalogo({
        pagina: this.pagina,
        limite: this.limite,
        busqueda: this.busqueda.trim() || undefined,
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

  protected cambiarPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected puedeCanjear(premio: Premio): boolean {
    return this.puntos() >= premio.puntosPremio;
  }

  protected confirmarCanje(premio: Premio): void {
    if (!this.puedeCanjear(premio) || this.canjeando() !== null) {
      return;
    }
    this.error.set('');
    this.exito.set('');
    this.porCanjear.set(premio);
  }

  protected cancelarCanje(): void {
    this.porCanjear.set(null);
  }

  protected ejecutarCanje(): void {
    const premio = this.porCanjear();
    if (!premio || this.canjeando() !== null) {
      return;
    }

    this.porCanjear.set(null);
    this.error.set('');
    this.exito.set('');
    this.canjeando.set(premio.idPremio);

    this.premiosService.canjear({ idPremio: premio.idPremio }).subscribe({
      next: (registro) => {
        this.canjeando.set(null);
        this.puntos.update((valor) => Math.max(0, valor - premio.puntosPremio));
        this.exito.set(`¡Canjeaste "${premio.nombrePremio}"!`);
        this.historial.update((lista) => [registro, ...lista]);
      },
      error: (err) => {
        this.canjeando.set(null);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  protected abrirDetalle(registro: HistorialPremio): void {
    this.verDetalle.set(registro);
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

  private cargarPerfil(): void {
    this.usuariosService.perfil().subscribe({
      next: (perfil) => this.puntos.set(perfil.puntos),
      error: () => this.puntos.set(0),
    });
  }
}
