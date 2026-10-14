import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { SupervisorService } from '../../core/services/supervisor.service';
import { AlertaComponent } from '../../shared/components/alerta/alerta.component';
import { InsigniaComponent } from '../../shared/components/insignia/insignia.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { ModalConfirmacionComponent } from '../../shared/components/modal-confirmacion/modal-confirmacion.component';
import { ImagenRotaDirective } from '../../shared/directives/imagen-rota.directive';
import { ImagenUrlPipe } from '../../shared/pipes/imagen-url.pipe';
import { mensajeDeError } from '../../shared/utils/error-http';
import { EstadoEvaluacion } from '../../core/models/participacion.model';
import { EstadoReto, type Reto } from '../../core/models/reto.model';
import type { EvidenciaPendiente, PanelSupervision } from '../../core/models/supervisor.model';
import { Rol, type Usuario } from '../../core/models/usuario.model';

type Pestana = 'tablero' | 'retos' | 'evidencias' | 'usuarios';

/**
 * Espacio de trabajo del Supervisor: las cuatro colas del panel y las
 * decisiones sobre retos y evidencias.
 *
 * La activación de cuentas pendientes es exclusiva del Administrador, así que
 * ese botón solo aparece cuando la sesión es de rol Administrador.
 */
@Component({
  selector: 'app-supervisor',
  imports: [
    FormsModule,
    AlertaComponent,
    InsigniaComponent,
    LoaderComponent,
    ModalConfirmacionComponent,
    ImagenRotaDirective,
    ImagenUrlPipe,
  ],
  styleUrl: './supervisor.component.css',
  templateUrl: './supervisor.component.html',
})
export class SupervisorComponent {
  private readonly supervisorService = inject(SupervisorService);
  private readonly adminService = inject(AdminService);
  protected readonly auth = inject(AuthService);

  protected readonly EstadoEvaluacion = EstadoEvaluacion;
  protected readonly EstadoReto = EstadoReto;

  protected pestana = signal<Pestana>('tablero');
  protected panel = signal<PanelSupervision | null>(null);
  protected retos = signal<Reto[]>([]);
  protected evidencias = signal<EvidenciaPendiente[]>([]);
  protected usuarios = signal<Usuario[]>([]);

  protected cargando = signal(true);
  protected procesando = signal(false);
  protected error = signal('');
  protected exito = signal('');

  /** Evidencia que se está revisando ahora mismo (id o null). */
  protected revisando = signal<number | null>(null);
  protected formEstado: EstadoEvaluacion = EstadoEvaluacion.Aprobado;
  protected formObservacion = '';
  protected formDias = 0;

  /** Reto que espera confirmación antes de cambiar de estado. */
  protected retoPorDecidir = signal<Reto | null>(null);
  protected decisionPendiente: EstadoReto | null = null;

  constructor() {
    this.cargarTodo();
  }

  protected irA(pestana: Pestana): void {
    this.pestana.set(pestana);
  }

  protected cargarTodo(): void {
    this.cargando.set(true);
    this.error.set('');

    this.supervisorService.panel().subscribe({
      next: (panel) => {
        this.panel.set(panel);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });

    this.supervisorService.retosPendientes({ limite: 20 }).subscribe({
      next: (retos) => this.retos.set(retos),
      error: () => this.retos.set([]),
    });

    this.supervisorService.evidenciasPendientes({ limite: 20 }).subscribe({
      next: (respuesta) => this.evidencias.set(respuesta.items),
      error: () => this.evidencias.set([]),
    });

    this.supervisorService.usuariosPendientes({ limite: 20 }).subscribe({
      next: (usuarios) => this.usuarios.set(usuarios),
      error: () => this.usuarios.set([]),
    });
  }

  /* ---------------------------------------------------------------
     Retos pendientes de aprobación
     --------------------------------------------------------------- */

  protected pedirDecision(reto: Reto, estado: EstadoReto): void {
    this.retoPorDecidir.set(reto);
    this.decisionPendiente = estado;
  }

  /** Texto del botón y del título de la confirmación de reto. */
  protected get etiquetaDecision(): string {
    switch (this.decisionPendiente) {
      case EstadoReto.Activo:
        return 'Aprobar';
      case EstadoReto.Negado:
        return 'Negar';
      case EstadoReto.Bloqueado:
        return 'Bloquear';
      default:
        return 'Cambiar estado';
    }
  }

  protected cancelarDecision(): void {
    this.retoPorDecidir.set(null);
    this.decisionPendiente = null;
  }

  protected confirmarDecision(): void {
    const reto = this.retoPorDecidir();
    const estado = this.decisionPendiente;

    if (!reto || !estado || this.procesando()) {
      return;
    }

    this.procesando.set(true);

    this.supervisorService.decidirReto(reto.idReto, { estadoReto: estado }).subscribe({
      next: () => {
        this.procesando.set(false);
        this.exito.set(`"${reto.nombreReto}" ahora está ${etiquetaDe(estado).toLowerCase()}.`);
        this.retos.update((lista) => lista.filter((r) => r.idReto !== reto.idReto));
        this.retoPorDecidir.set(null);
        this.decisionPendiente = null;
        this.refrescarPanel();
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(mensajeDeError(err));
        this.retoPorDecidir.set(null);
        this.decisionPendiente = null;
      },
    });
  }

  /* ---------------------------------------------------------------
     Revisión de evidencias
     --------------------------------------------------------------- */

  protected abrirRevision(evidencia: EvidenciaPendiente): void {
    this.revisando.set(evidencia.idParticipacion);
    this.formEstado = EstadoEvaluacion.Aprobado;
    this.formObservacion = '';
    this.formDias = 0;
    this.error.set('');
    this.exito.set('');
  }

  protected cerrarRevision(): void {
    this.revisando.set(null);
  }

  protected revisar(evidencia: EvidenciaPendiente): void {
    if (this.procesando()) {
      return;
    }

    this.error.set('');

    if (this.formEstado !== EstadoEvaluacion.Aprobado && !this.formObservacion.trim()) {
      this.error.set('Explicá el motivo: la observación es obligatoria al negar o bloquear.');
      return;
    }

    this.procesando.set(true);

    this.supervisorService
      .revisarEvidencia(evidencia.idParticipacion, {
        estadoParticipacion: this.formEstado,
        observacionRevision: this.formObservacion.trim() || undefined,
        diasCumplidos: this.formEstado === EstadoEvaluacion.Aprobado ? this.formDias : undefined,
      })
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.revisando.set(null);
          this.exito.set(`Evidencia ${etiquetaDe(this.formEstado).toLowerCase()}.`);
          this.evidencias.update((lista) =>
            lista.filter((e) => e.idParticipacion !== evidencia.idParticipacion),
          );
          this.refrescarPanel();
        },
        error: (err) => {
          this.procesando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  /* ---------------------------------------------------------------
     Usuarios pendientes (activación: solo Administrador)
     --------------------------------------------------------------- */

  protected get esAdministrador(): boolean {
    return this.auth.rol() === Rol.Administrador;
  }

  protected activar(usuario: Usuario): void {
    if (this.procesando()) {
      return;
    }

    this.error.set('');
    this.procesando.set(true);

    this.adminService.activar(usuario.idUsuario).subscribe({
      next: () => {
        this.procesando.set(false);
        this.exito.set(`${usuario.alias} ya puede iniciar sesión.`);
        this.usuarios.update((lista) => lista.filter((u) => u.idUsuario !== usuario.idUsuario));
        this.refrescarPanel();
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

  private refrescarPanel(): void {
    this.supervisorService.panel().subscribe({
      next: (panel) => this.panel.set(panel),
      error: () => undefined,
    });
  }
}

function etiquetaDe(estado: EstadoReto | EstadoEvaluacion): string {
  switch (estado) {
    case EstadoReto.Activo:
      return 'Activo';
    case EstadoReto.Negado:
      return 'Negado';
    case EstadoReto.Bloqueado:
      return 'Bloqueado';
    case EstadoReto.Finalizado:
      return 'Finalizado';
    case EstadoEvaluacion.Aprobado:
      return 'Aprobada';
    case EstadoEvaluacion.Negado:
      return 'Rechazada';
    default:
      return String(estado);
  }
}
