import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SoporteService } from '../../../core/services/soporte.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { InsigniaComponent } from '../../../shared/components/insignia/insignia.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { PaginacionComponent } from '../../../shared/components/paginacion/paginacion.component';
import { ImagenRotaDirective } from '../../../shared/directives/imagen-rota.directive';
import { ImagenUrlPipe } from '../../../shared/pipes/imagen-url.pipe';
import { mensajeDeError } from '../../../shared/utils/error-http';
import { EstadoEvaluacion } from '../../../core/models/participacion.model';
import type { ConteoPorEstado } from '../../../core/models/admin.model';
import type { Soporte } from '../../../core/models/soporte.model';

const ESTADOS = Object.values(EstadoEvaluacion);

/**
 * Buzón de soporte del Administrador. Un solo modal "Ver" muestra los datos del
 * ticket y, cuando está abierto, permite responderlo: estado de resolución y un
 * texto con el motivo de la respuesta (se guarda en `respuesta_soporte`).
 */
@Component({
  selector: 'app-soporte-admin',
  imports: [
    FormsModule,
    AlertaComponent,
    InsigniaComponent,
    LoaderComponent,
    PaginacionComponent,
    ImagenRotaDirective,
    ImagenUrlPipe,
  ],
  styleUrl: './soporte-admin.component.css',
  templateUrl: './soporte-admin.component.html',
})
export class SoporteAdminComponent {
  private readonly soporteService = inject(SoporteService);

  protected readonly EstadoEvaluacion = EstadoEvaluacion;
  protected readonly estados = ESTADOS;

  protected items = signal<Soporte[]>([]);
  protected estadisticas = signal<ConteoPorEstado<EstadoEvaluacion>[]>([]);
  protected total = signal(0);
  protected cargando = signal(true);
  protected procesando = signal(false);
  protected error = signal('');
  protected exito = signal('');

  protected estado = '';
  protected pagina = 1;
  protected readonly limite = 10;

  protected ver = signal<Soporte | null>(null);
  protected formEstado: EstadoEvaluacion = EstadoEvaluacion.Aprobado;
  protected formRespuesta = '';

  constructor() {
    this.cargar();

    this.soporteService.estadisticas().subscribe({
      next: (conteos) => this.estadisticas.set(conteos),
      error: () => this.estadisticas.set([]),
    });
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.soporteService
      .listar({
        pagina: this.pagina,
        limite: this.limite,
        estadoSoporte: (this.estado as EstadoEvaluacion) || undefined,
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
    this.exito.set('');
    this.cargar();
  }

  protected limpiar(): void {
    this.estado = '';
    this.buscar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina = pagina;
    this.exito.set('');
    this.cargar();
  }

  protected esAbierto(ticket: Soporte): boolean {
    return ticket.estadoSoporte === EstadoEvaluacion.Enviado;
  }

  protected abrir(ticket: Soporte): void {
    this.error.set('');
    this.exito.set('');
    this.ver.set(ticket);
    this.formEstado = EstadoEvaluacion.Aprobado;
    this.formRespuesta = ticket.respuestaSoporte ?? '';
  }

  protected cerrar(): void {
    this.ver.set(null);
  }

  protected responder(): void {
    const ticket = this.ver();
    if (!ticket || this.procesando()) {
      return;
    }

    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    const respuesta = this.formRespuesta.trim();

    this.soporteService
      .responder(ticket.idSoporte, {
        estadoSoporte: this.formEstado,
        respuestaSoporte: respuesta || undefined,
      })
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.ver.set(null);
          this.exito.set(`Ticket #${ticket.idSoporte} respondido.`);
          this.cargar();
        },
        error: (err) => {
          this.procesando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  /** Alias del administrador que atendió el ticket, o su id si no llegó el nombre. */
  protected revisor(ticket: Soporte): string {
    if (ticket.aliasRevisor) {
      return ticket.aliasRevisor;
    }
    return ticket.idRevisorS ? `Usuario #${ticket.idRevisorS}` : '—';
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
