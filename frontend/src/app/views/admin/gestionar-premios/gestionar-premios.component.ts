import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PremiosService } from '../../../core/services/premios.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { InsigniaComponent } from '../../../shared/components/insignia/insignia.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ModalConfirmacionComponent } from '../../../shared/components/modal-confirmacion/modal-confirmacion.component';
import { PaginacionComponent } from '../../../shared/components/paginacion/paginacion.component';
import { ImagenRotaDirective } from '../../../shared/directives/imagen-rota.directive';
import { ImagenUrlPipe } from '../../../shared/pipes/imagen-url.pipe';
import { mensajeDeError } from '../../../shared/utils/error-http';
import { EstadoPremio, type Premio } from '../../../core/models/premio.model';

const VACIO = { nombrePremio: '', descripcionPremio: '', puntosPremio: 0, imagenPremio: '' };

/**
 * ABM de premios con subida de imagen (jpg, png, webp máx 5 MB).
 * La imagen se guarda en carpeta por ID del premio y archivo renombrado con el ID.
 * Si se sube una nueva, sobrescribe la anterior.
 */
@Component({
  selector: 'app-gestionar-premios',
  imports: [
    FormsModule,
    AlertaComponent,
    InsigniaComponent,
    LoaderComponent,
    ModalConfirmacionComponent,
    PaginacionComponent,
    ImagenRotaDirective,
    ImagenUrlPipe,
  ],
  styleUrl: './gestionar-premios.component.css',
  templateUrl: './gestionar-premios.component.html',
})
export class GestionarPremiosComponent {
  private readonly premiosService = inject(PremiosService);

  protected readonly EstadoPremio = EstadoPremio;

  protected items = signal<Premio[]>([]);
  protected total = signal(0);
  protected cargando = signal(true);
  protected error = signal('');
  protected exito = signal('');
  protected procesando = signal(false);
  protected subiendoImagen = signal(false);

  protected busqueda = '';
  protected pagina = 1;
  protected readonly limite = 10;

  /** true cuando el formulario está visible; `editando` decide alta o edición. */
  protected formAbierto = signal(false);
  protected editando: Premio | null = null;
  protected form = { ...VACIO };
  protected imagenSeleccionada: File | null = null;
  protected vistaPreviaImagen: string | null = null;
  protected porEliminar = signal<Premio | null>(null);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.premiosService
      .listarAdmin({
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

  protected limpiar(): void {
    this.busqueda = '';
    this.buscar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
  }

  protected abrirAlta(): void {
    this.editando = null;
    this.formAbierto.set(true);
    this.form = { ...VACIO, puntosPremio: 50 };
    this.imagenSeleccionada = null;
    this.vistaPreviaImagen = null;
    this.error.set('');
  }

  protected abrirEdicion(premio: Premio): void {
    this.editando = premio;
    this.formAbierto.set(true);
    this.form = {
      nombrePremio: premio.nombrePremio,
      descripcionPremio: premio.descripcionPremio,
      puntosPremio: premio.puntosPremio,
      imagenPremio: premio.imagenPremio || '',
    };
    this.imagenSeleccionada = null;
    this.vistaPreviaImagen = premio.imagenPremio || null;
    this.error.set('');
  }

  protected cerrarFormulario(): void {
    this.formAbierto.set(false);
    this.imagenSeleccionada = null;
    this.vistaPreviaImagen = null;
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
    this.vistaPreviaImagen = this.editando?.imagenPremio || null;
  }

  protected async guardar(): Promise<void> {
    if (this.form.nombrePremio.trim().length < 3) {
      this.error.set('El nombre necesita al menos 3 caracteres.');
      return;
    }
    if (this.form.descripcionPremio.trim().length < 3) {
      this.error.set('La descripción necesita al menos 3 caracteres.');
      return;
    }
    if (this.form.puntosPremio <= 0) {
      this.error.set('Los puntos deben ser mayores a cero.');
      return;
    }

    const enEdicion = this.editando;
    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    const cuerpo = {
      nombrePremio: this.form.nombrePremio.trim(),
      descripcionPremio: this.form.descripcionPremio.trim(),
      puntosPremio: Number(this.form.puntosPremio),
      imagenPremio: this.form.imagenPremio,
    };

    const operacion = enEdicion
      ? this.premiosService.actualizar(enEdicion.idPremio, cuerpo)
      : this.premiosService.crear(cuerpo);

    operacion.subscribe({
      next: (premioCreado) => {
        if (this.imagenSeleccionada) {
          this.subiendoImagen.set(true);
          this.premiosService
            .subirImagen(premioCreado.idPremio, this.imagenSeleccionada!)
            .subscribe({
              next: (res) => {
                // Actualiza el premio con la ruta de la imagen subida
                this.premiosService
                  .actualizar(premioCreado.idPremio, { imagenPremio: res.imagenPremio })
                  .subscribe({
                    next: () => {
                      this.procesando.set(false);
                      this.subiendoImagen.set(false);
                      this.formAbierto.set(false);
                      this.imagenSeleccionada = null;
                      this.vistaPreviaImagen = null;
                      this.exito.set(enEdicion ? 'Premio actualizado.' : 'Premio creado.');
                      this.cargar();
                    },
                    error: (err) => {
                      this.procesando.set(false);
                      this.subiendoImagen.set(false);
                      this.error.set(mensajeDeError(err));
                    },
                  });
              },
              error: (err) => {
                this.procesando.set(false);
                this.subiendoImagen.set(false);
                this.error.set(mensajeDeError(err));
              },
            });
        } else {
          this.procesando.set(false);
          this.formAbierto.set(false);
          this.exito.set(enEdicion ? 'Premio actualizado.' : 'Premio creado.');
          this.cargar();
        }
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  protected confirmarEliminacion(): void {
    const premio = this.porEliminar();
    if (!premio) {
      return;
    }

    this.porEliminar.set(null);
    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    this.premiosService.eliminar(premio.idPremio).subscribe({
      next: () => {
        this.procesando.set(false);
        this.exito.set(`«${premio.nombrePremio}» dado de baja.`);
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

  /** Baja lógica al revés: el premio vuelve al catálogo público. */
  protected restaurar(premio: Premio): void {
    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    this.premiosService.actualizar(premio.idPremio, { estado: EstadoPremio.Activo }).subscribe({
      next: () => {
        this.procesando.set(false);
        this.exito.set(`«${premio.nombrePremio}» restaurado.`);
        this.cargar();
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  protected eliminarImagenPremio(premio: Premio): void {
    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    this.premiosService.eliminarImagen(premio.idPremio).subscribe({
      next: () => {
        this.procesando.set(false);
        this.exito.set('Imagen eliminada.');
        premio.imagenPremio = null;
        if (this.editando?.idPremio === premio.idPremio) {
          this.form.imagenPremio = '';
          this.vistaPreviaImagen = null;
        }
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }
}
