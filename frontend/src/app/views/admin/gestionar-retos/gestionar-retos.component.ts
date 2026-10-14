import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CATEGORIAS_RETO } from '../../../core/constants/categorias-reto';
import { RetosService } from '../../../core/services/retos.service';
import { SupervisorService } from '../../../core/services/supervisor.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { InsigniaComponent } from '../../../shared/components/insignia/insignia.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ModalConfirmacionComponent } from '../../../shared/components/modal-confirmacion/modal-confirmacion.component';
import { PaginacionComponent } from '../../../shared/components/paginacion/paginacion.component';
import { ImagenRotaDirective } from '../../../shared/directives/imagen-rota.directive';
import { ImagenUrlPipe } from '../../../shared/pipes/imagen-url.pipe';
import { mensajeDeError } from '../../../shared/utils/error-http';
import { insigniaDe } from '../../../shared/utils/estados';
import { Dificultad, EstadoReto, type Reto } from '../../../core/models/reto.model';

const ESTADOS = Object.values(EstadoReto);
const DIFICULTADES = Object.values(Dificultad);

/**
 * Listado completo de retos con `todosEstados` (flag reservado al staff), más
 * edición, baja lógica (eliminar / restaurar) y la supervision de estado
 * (aprobar / negar / bloquear). La dificultad y los puntos los recalcula el
 * backend cuando cambia la fecha límite, así que el formulario nunca los edita.
 */
@Component({
  selector: 'app-gestionar-retos',
  imports: [
    FormsModule,
    RouterLink,
    AlertaComponent,
    InsigniaComponent,
    LoaderComponent,
    ModalConfirmacionComponent,
    PaginacionComponent,
    ImagenRotaDirective,
    ImagenUrlPipe,
  ],
  styleUrl: './gestionar-retos.component.css',
  templateUrl: './gestionar-retos.component.html',
})
export class GestionarRetosComponent {
  private readonly retosService = inject(RetosService);
  private readonly supervisorService = inject(SupervisorService);

  protected readonly estados = ESTADOS;
  protected readonly dificultades = DIFICULTADES;
  protected readonly categorias = CATEGORIAS_RETO;
  protected readonly EstadoReto = EstadoReto;
  /** Decisiones que el backend acepta desde el estado actual de un reto. */
  protected readonly decisiones = [
    {
      valor: EstadoReto.Activo,
      titulo: 'Aprobar',
      texto: 'Se publica en el inicio del campus y queda abierto a participantes.',
    },
    {
      valor: EstadoReto.Negado,
      titulo: 'Negar',
      texto: 'Queda rechazado: no aparece en el inicio ni admite participantes.',
    },
    {
      valor: EstadoReto.Bloqueado,
      titulo: 'Bloquear',
      texto: 'Retirado del inicio de forma temporal, pendiente de corrección.',
    },
  ] as const;

  protected items = signal<Reto[]>([]);
  protected total = signal(0);
  protected cargando = signal(true);
  protected error = signal('');
  protected exito = signal('');
  protected procesando = signal(false);

  protected busqueda = '';
  protected estado = '';
  protected dificultad = '';
  protected pagina = 1;
  protected readonly limite = 10;

  protected editando = signal<Reto | null>(null);
  protected porEliminar = signal<Reto | null>(null);
  protected porSupervisar = signal<Reto | null>(null);
  protected decision: EstadoReto = EstadoReto.Activo;
  protected subiendoImagen = signal(false);

  protected form = {
    nombreReto: '',
    descripcionReto: '',
    categoria: '',
    fechaLimite: '',
    imagenReto: '',
  };
  protected imagenSeleccionada: File | null = null;
  protected vistaPreviaImagen: string | null = null;

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.retosService
      .listar({
        pagina: this.pagina,
        limite: this.limite,
        todosEstados: true,
        incluirVencidos: true,
        busqueda: this.busqueda.trim() || undefined,
        estadoReto: (this.estado as EstadoReto) || undefined,
        dificultad: (this.dificultad as Dificultad) || undefined,
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

  protected limpiar(): void {
    this.busqueda = '';
    this.estado = '';
    this.dificultad = '';
    this.buscar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
  }

  protected abrirEdicion(reto: Reto): void {
    this.editando.set(reto);
    this.form = {
      nombreReto: reto.nombreReto,
      descripcionReto: reto.descripcionReto,
      categoria: reto.categoria,
      fechaLimite: reto.fechaLimite.slice(0, 10),
      imagenReto: reto.imagenReto || '',
    };
    this.imagenSeleccionada = null;
    this.vistaPreviaImagen = reto.imagenReto || null;
    this.error.set('');
  }

  protected cerrarEdicion(): void {
    this.editando.set(null);
    this.imagenSeleccionada = null;
    if (this.vistaPreviaImagen && this.vistaPreviaImagen.startsWith('blob:')) {
      URL.revokeObjectURL(this.vistaPreviaImagen);
    }
    this.vistaPreviaImagen = null;
  }

  protected guardarEdicion(): void {
    const reto = this.editando();
    if (!reto) {
      return;
    }

    if (this.form.nombreReto.trim().length < 3) {
      this.error.set('El nombre necesita al menos 3 caracteres.');
      return;
    }
    if (this.form.descripcionReto.trim().length < 10) {
      this.error.set('La descripción necesita al menos 10 caracteres.');
      return;
    }
    if (this.form.categoria.trim().length < 3) {
      this.error.set('La categoría necesita al menos 3 caracteres.');
      return;
    }
    if (!this.form.fechaLimite) {
      this.error.set('Elige una fecha límite.');
      return;
    }

    this.error.set('');
    this.exito.set('');

    if (this.imagenSeleccionada) {
      this.subiendoImagen.set(true);
      this.retosService.subirImagen(reto.idReto, this.imagenSeleccionada).subscribe({
        next: (res) => {
          this.subiendoImagen.set(false);
          this.form.imagenReto = res.imagenReto;
          this.actualizarReto(reto);
        },
        error: (err) => {
          this.subiendoImagen.set(false);
          this.procesando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
    } else {
      this.actualizarReto(reto);
    }
  }

  private actualizarReto(reto: Reto): void {
    this.procesando.set(true);
    this.retosService
      .actualizar(reto.idReto, {
        nombreReto: this.form.nombreReto.trim(),
        descripcionReto: this.form.descripcionReto.trim(),
        categoria: this.form.categoria.trim(),
        fechaLimite: `${this.form.fechaLimite}T23:59:59`,
      })
      .subscribe({
        next: (actualizado) => {
          this.procesando.set(false);
          this.editando.set(null);
          this.imagenSeleccionada = null;
          if (this.vistaPreviaImagen && this.vistaPreviaImagen.startsWith('blob:')) {
            URL.revokeObjectURL(this.vistaPreviaImagen);
          }
          this.vistaPreviaImagen = null;
          this.exito.set(`"${actualizado.nombreReto}" actualizado.`);
          this.cargar();
        },
        error: (err) => {
          this.procesando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  protected onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const extensiones = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!extensiones.includes(ext)) {
      this.error.set('Solo se permiten imágenes JPG, PNG o WebP.');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('La imagen no debe superar 5 MB.');
      input.value = '';
      return;
    }
    this.imagenSeleccionada = file;
    this.vistaPreviaImagen = URL.createObjectURL(file);
    this.error.set('');
  }

  protected quitarImagen(): void {
    this.imagenSeleccionada = null;
    if (this.vistaPreviaImagen && this.vistaPreviaImagen.startsWith('blob:')) {
      URL.revokeObjectURL(this.vistaPreviaImagen);
    }
    const reto = this.editando();
    this.vistaPreviaImagen = reto?.imagenReto || null;
  }

  protected eliminarImagenReto(reto: Reto): void {
    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    this.retosService.eliminarImagen(reto.idReto).subscribe({
      next: () => {
        this.procesando.set(false);
        this.exito.set('Imagen eliminada.');
        reto.imagenReto = null;
        if (this.editando()?.idReto === reto.idReto) {
          this.vistaPreviaImagen = null;
        }
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  protected confirmarEliminacion(): void {
    const reto = this.porEliminar();
    if (!reto) {
      return;
    }

    this.porEliminar.set(null);
    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    this.retosService.eliminar(reto.idReto).subscribe({
      next: () => {
        this.procesando.set(false);
        this.exito.set(`"${reto.nombreReto}" quedó desactivado.`);
        this.cargar();
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  protected cancelarEliminacion(): void {
    this.porEliminar.set(null);
  }

  /** Baja lógica al revés: el reto vuelve a estar activo en el feed. */
  protected restaurar(reto: Reto): void {
    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    this.supervisorService.decidirReto(reto.idReto, { estadoReto: EstadoReto.Activo }).subscribe({
      next: () => {
        this.procesando.set(false);
        this.exito.set(`"${reto.nombreReto}" restaurado y publicado en el inicio.`);
        this.cargar();
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  /** Un reto finalizado ya no admite cambios de estado en el backend. */
  protected puedeSupervisar(reto: Reto): boolean {
    return reto.estadoReto !== EstadoReto.Finalizado;
  }

  protected supervisar(reto: Reto): void {
    this.error.set('');
    // Revisando algo que todavía no está activo conviene aprobar; un activo,
    // retirarlo.
    this.decision =
      reto.estadoReto === EstadoReto.Activo ? EstadoReto.Bloqueado : EstadoReto.Activo;
    this.porSupervisar.set(reto);
  }

  protected cancelarSupervision(): void {
    this.porSupervisar.set(null);
  }

  protected confirmarSupervision(): void {
    const reto = this.porSupervisar();
    if (!reto) {
      return;
    }

    const decision = this.decision;
    this.porSupervisar.set(null);
    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    this.supervisorService.decidirReto(reto.idReto, { estadoReto: decision }).subscribe({
      next: () => {
        this.procesando.set(false);
        this.exito.set(
          `"${reto.nombreReto}" quedó en estado ${insigniaDe(decision).texto.toLowerCase()}.`,
        );
        this.cargar();
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  protected fecha(iso: string): string {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) {
      return iso;
    }
    return fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
