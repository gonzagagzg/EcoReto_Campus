import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SoporteService } from '../../core/services/soporte.service';
import { AlertaComponent } from '../../shared/components/alerta/alerta.component';
import { InsigniaComponent } from '../../shared/components/insignia/insignia.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { PaginacionComponent } from '../../shared/components/paginacion/paginacion.component';
import { ImagenRotaDirective } from '../../shared/directives/imagen-rota.directive';
import { ImagenUrlPipe } from '../../shared/pipes/imagen-url.pipe';
import { mensajeDeError } from '../../shared/utils/error-http';
import type { Soporte } from '../../core/models/soporte.model';

const ESTADOS = ['Enviado', 'Aprobado', 'Negado', 'Bloqueado'] as const;

/**
 * Mesa de ayuda del estudiante: crea tickets y consulta los suyos. Responder
 * es exclusivo del Administrador; un ticket ya atendido no se puede reabrir.
 */
@Component({
  selector: 'app-soporte',
  imports: [
    FormsModule,
    AlertaComponent,
    InsigniaComponent,
    LoaderComponent,
    PaginacionComponent,
    ImagenRotaDirective,
    ImagenUrlPipe,
  ],
  styleUrl: './soporte.component.css',
  templateUrl: './soporte.component.html',
})
export class SoporteComponent {
  private readonly soporteService = inject(SoporteService);

  protected tickets = signal<Soporte[]>([]);
  protected total = signal(0);
  protected cargando = signal(true);
  protected error = signal('');
  protected exito = signal('');
  protected enviando = signal(false);
  protected ver = signal<Soporte | null>(null);

  protected nombreSoporte = '';
  protected detalleSoporte = '';
  protected archivo: File | null = null;
  protected vistaPrevia: string | null = null;

  protected estado = '';
  protected pagina = 1;
  protected readonly limite = 5;
  protected readonly estados = ESTADOS;

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.soporteService
      .misTickets({
        pagina: this.pagina,
        limite: this.limite,
        estadoSoporte: (this.estado as Soporte['estadoSoporte']) || undefined,
      })
      .subscribe({
        next: (respuesta) => {
          this.tickets.set(respuesta.items);
          this.total.set(respuesta.total);
          this.cargando.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  protected seleccionar(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    this.liberarVistaPrevia();
    this.error.set('');

    if (!archivo) {
      this.archivo = null;
      return;
    }

    if (!archivo.type.startsWith('image/')) {
      this.archivo = null;
      input.value = '';
      this.error.set('La imagen debe ser JPG, PNG o WebP.');
      return;
    }

    this.archivo = archivo;
    this.vistaPrevia = URL.createObjectURL(archivo);
  }

  protected quitarImagen(): void {
    this.archivo = null;
    this.liberarVistaPrevia();
  }

  protected enviar(): void {
    const fallos: string[] = [];

    if (this.nombreSoporte.trim().length < 5) {
      fallos.push('El título necesita al menos 5 caracteres.');
    }
    if (this.detalleSoporte.trim().length < 10) {
      fallos.push('Cuentanos un poco más: al menos 10 caracteres.');
    }

    if (fallos.length) {
      this.error.set(fallos.join(' '));
      return;
    }

    this.error.set('');
    this.exito.set('');
    this.enviando.set(true);

    this.soporteService
      .crear({
        nombreSoporte: this.nombreSoporte.trim(),
        detalleSoporte: this.detalleSoporte.trim(),
        imagen: this.archivo ?? undefined,
      })
      .subscribe({
        next: (ticket) => {
          this.enviando.set(false);
          this.exito.set(`Ticket #${ticket.idSoporte} enviado. Te respondemos por acá.`);
          this.nombreSoporte = '';
          this.detalleSoporte = '';
          this.quitarImagen();
          this.pagina = 1;
          this.cargar();
        },
        error: (err) => {
          this.enviando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
  }

  protected cambiarEstado(): void {
    this.pagina = 1;
    this.cargar();
  }

  protected abrir(ticket: Soporte): void {
    this.ver.set(ticket);
  }

  protected cerrar(): void {
    this.ver.set(null);
  }

  protected revisor(ticket: Soporte): string {
    if (ticket.estadoSoporte === 'Enviado' || !ticket.aliasRevisor) {
      return '—';
    }
    return ticket.aliasRevisor;
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

  private liberarVistaPrevia(): void {
    if (this.vistaPrevia) {
      URL.revokeObjectURL(this.vistaPrevia);
      this.vistaPrevia = null;
    }
  }
}
