import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { SupervisorService } from '../../../core/services/supervisor.service';
import { ParticipacionesService } from '../../../core/services/participaciones.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { InsigniaComponent } from '../../../shared/components/insignia/insignia.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { PaginacionComponent } from '../../../shared/components/paginacion/paginacion.component';
import { ImagenRotaDirective } from '../../../shared/directives/imagen-rota.directive';
import { ImagenUrlPipe } from '../../../shared/pipes/imagen-url.pipe';
import { mensajeDeError } from '../../../shared/utils/error-http';
import { EstadoEvaluacion } from '../../../core/models/participacion.model';
import type { ParticipacionHistorial } from '../../../core/models/admin.model';

const ESTADOS = Object.values(EstadoEvaluacion);

/**
 * Historial de evidencias de todo el campus. El botón "Ver" abre el detalle
 * completo de la evidencia y desde ahí se aprueba, se niega o se bloquea;
 * el campo observacion_revision guarda el comentario del usuario y la
 * respuesta del staff queda en respuesta_evidencia.
 */
@Component({
  selector: 'app-historial-registros',
  imports: [
    FormsModule,
    AlertaComponent,
    InsigniaComponent,
    LoaderComponent,
    PaginacionComponent,
    ImagenRotaDirective,
    ImagenUrlPipe,
  ],
  styleUrl: './historial-registros.component.css',
  templateUrl: './historial-registros.component.html',
})
export class HistorialRegistrosComponent {
  private readonly adminService = inject(AdminService);
  private readonly supervisorService = inject(SupervisorService);
  private readonly participacionesService = inject(ParticipacionesService);

  protected readonly estados = ESTADOS;
  protected readonly EstadoEvaluacion = EstadoEvaluacion;

  protected items = signal<ParticipacionHistorial[]>([]);
  protected total = signal(0);
  protected cargando = signal(true);
  protected procesando = signal(false);
  protected error = signal('');
  protected exito = signal('');

  protected estado = '';
  protected idUsuario = '';
  protected busqueda = '';
  protected pagina = 1;
  protected readonly limite = 15;

  protected ver = signal<ParticipacionHistorial | null>(null);
  protected formEstado: EstadoEvaluacion = EstadoEvaluacion.Aprobado;
  protected formRespuesta = '';
  protected formDias = 0;
  protected cargandoDias = signal(false);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    const usuario = Number(this.idUsuario);

    this.adminService
      .listarParticipaciones({
        pagina: this.pagina,
        limite: this.limite,
        estadoParticipacion: (this.estado as EstadoEvaluacion) || undefined,
        idUsuario: Number.isInteger(usuario) && usuario > 0 ? usuario : undefined,
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
    this.exito.set('');
    this.cargar();
  }

  protected limpiar(): void {
    this.estado = '';
    this.idUsuario = '';
    this.busqueda = '';
    this.buscar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina = pagina;
    this.exito.set('');
    this.cargar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected abrir(registro: ParticipacionHistorial): void {
    this.error.set('');
    this.exito.set('');
    this.ver.set(registro);
    this.formEstado = EstadoEvaluacion.Aprobado;
    this.formRespuesta = registro.respuestaEvidencia ?? '';
    this.formDias = 0;
    this.cargarDiasAprobados(registro.idReto, registro.idUsuario);
  }

  private cargarDiasAprobados(idReto: number | null, idUsuario: number): void {
    if (!idReto) {
      this.formDias = 1;
      return;
    }
    this.cargandoDias.set(true);
    this.participacionesService.contarAprobadasPorRetoYUsuario(idReto, idUsuario).subscribe({
      next: (count) => {
        this.cargandoDias.set(false);
        // Los días cumplidos = evidencias ya aprobadas + 1 (la que se está revisando ahora)
        this.formDias = count + 1;
      },
      error: () => {
        this.cargandoDias.set(false);
        this.formDias = 1; // fallback: al menos la actual
      },
    });
  }

  protected cerrar(): void {
    this.ver.set(null);
  }

  protected revisar(): void {
    const registro = this.ver();
    if (!registro || this.procesando()) {
      return;
    }

    this.error.set('');
    this.exito.set('');

    this.procesando.set(true);

    this.supervisorService
      .revisarEvidencia(registro.idParticipacion, {
        estadoParticipacion: this.formEstado,
        respuestaEvidencia: this.formRespuesta.trim() || undefined,
        diasCumplidos: this.formEstado === EstadoEvaluacion.Aprobado ? this.formDias : undefined,
      })
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.exito.set(
            `Evidencia de ${registro.nombreUsuario} marcada como ${this.formEstado.toLowerCase()}.`,
          );
          this.cerrar();
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
