import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { InsigniaComponent } from '../../../shared/components/insignia/insignia.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { PaginacionComponent } from '../../../shared/components/paginacion/paginacion.component';
import { mensajeDeError } from '../../../shared/utils/error-http';
import { EstadoCanjePremio } from '../../../core/models/admin.model';
import type { HistorialPremioAdmin } from '../../../core/models/admin.model';

/**
 * Gestión de canjes de premios. Solo Administrador.
 * Permite ver el historial y cambiar el estado de cada canje.
 */
@Component({
  selector: 'app-gestionar-premios-canjeados',
  imports: [
    FormsModule,
    AlertaComponent,
    InsigniaComponent,
    LoaderComponent,
    PaginacionComponent,
  ],
  styleUrl: './gestionar-premios-canjeados.component.css',
  templateUrl: './gestionar-premios-canjeados.component.html',
})
export class GestionarPremiosCanjeadosComponent {
  private readonly adminService = inject(AdminService);

  protected readonly EstadoCanjePremio = EstadoCanjePremio;
  protected readonly estadosCanje = Object.values(EstadoCanjePremio);

  protected items = signal<HistorialPremioAdmin[]>([]);
  protected total = signal(0);
  protected cargando = signal(true);
  protected error = signal('');
  protected exito = signal('');
  protected procesando = signal(false);

  protected busqueda = '';
  protected estadoFiltro = '';
  protected pagina = 1;
  protected readonly limite = 15;

  protected verEstado = signal<HistorialPremioAdmin | null>(null);
  protected formEstado = EstadoCanjePremio.Pendiente;
  protected formObservacion = '';

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.adminService
      .listarHistorialPremios(this.pagina, this.limite, this.busqueda || undefined, this.estadoFiltro || undefined)
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
    this.estadoFiltro = '';
    this.buscar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected abrirCambioEstado(item: HistorialPremioAdmin): void {
    this.error.set('');
    this.exito.set('');
    this.verEstado.set(item);
    this.formEstado = item.estadoCanjePremio as EstadoCanjePremio;
    this.formObservacion = item.observacionCanje ?? '';
  }

  protected cerrarCambioEstado(): void {
    this.verEstado.set(null);
  }

  protected esSoloLectura(estado: string): boolean {
    return estado === EstadoCanjePremio.Reclamado || estado === EstadoCanjePremio.Negado;
  }

  protected textoBotonAccion(estado: string): string {
    return 'Ver Canje';
  }

  protected async aplicarEstado(): Promise<void> {
    const item = this.verEstado();
    if (!item || this.procesando()) {
      return;
    }

    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    this.adminService
      .actualizarEstadoCanjePremio(item.idHistorialPremio, this.formEstado, this.formObservacion)
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.exito.set(`Estado del canje #${item.idHistorialPremio} cambiado a ${this.formEstado}.`);
          this.cerrarCambioEstado();
          this.cargar();
        },
        error: (err) => {
          this.procesando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
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
}