import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { InsigniaComponent } from '../../../shared/components/insignia/insignia.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ModalConfirmacionComponent } from '../../../shared/components/modal-confirmacion/modal-confirmacion.component';
import { PaginacionComponent } from '../../../shared/components/paginacion/paginacion.component';
import { ImagenRotaDirective } from '../../../shared/directives/imagen-rota.directive';
import { ImagenUrlPipe } from '../../../shared/pipes/imagen-url.pipe';
import { mensajeDeError } from '../../../shared/utils/error-http';
import { EstadoGusto, type Gusto } from '../../../core/models/gusto.model';

const VACIO = { nombreGusto: '', imagenGusto: '' };

/**
 * ABM de gustos (intereses). Solo Administrador.
 * Permite crear, editar, ver y dar de baja gustos.
 * Sube imagen (jpg, png, webp máx 5 MB) a carpeta por ID, archivo renombrado con ID.
 */
@Component({
  selector: 'app-gestionar-gustos',
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
  styleUrl: './gestionar-gustos.component.css',
  templateUrl: './gestionar-gustos.component.html',
})
export class GestionarGustosComponent {
  private readonly usuariosService = inject(UsuariosService);

  protected readonly EstadoGusto = EstadoGusto;

  protected items = signal<Gusto[]>([]);
  protected total = signal(0);
  protected cargando = signal(true);
  protected error = signal('');
  protected exito = signal('');
  protected procesando = signal(false);
  protected subiendoImagen = signal(false);

  protected busqueda = '';
  protected estadoFiltro = '';
  protected pagina = 1;
  protected readonly limite = 10;

  protected formAbierto = signal(false);
  protected editando: Gusto | null = null;
  protected form = { ...VACIO };
  protected imagenSeleccionada: File | null = null;
  protected vistaPreviaImagen: string | null = null;
  protected porEliminar = signal<Gusto | null>(null);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.usuariosService
      .listarGustosAdmin({
        pagina: this.pagina,
        limite: this.limite,
        busqueda: this.busqueda.trim() || undefined,
        estado: (this.estadoFiltro as EstadoGusto) || undefined,
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
    this.estadoFiltro = '';
    this.buscar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
  }

  protected abrirAlta(): void {
    this.editando = null;
    this.formAbierto.set(true);
    this.form = { ...VACIO };
    this.imagenSeleccionada = null;
    this.vistaPreviaImagen = null;
    this.error.set('');
  }

  protected abrirEdicion(gusto: Gusto): void {
    this.editando = gusto;
    this.formAbierto.set(true);
    this.form = {
      nombreGusto: gusto.nombreGusto,
      imagenGusto: gusto.imagenGusto || '',
    };
    this.imagenSeleccionada = null;
    this.vistaPreviaImagen = gusto.imagenGusto || null;
    this.error.set('');
  }

  protected cerrarFormulario(): void {
    this.formAbierto.set(false);
    this.imagenSeleccionada = null;
    if (this.vistaPreviaImagen && this.vistaPreviaImagen.startsWith('blob:')) {
      URL.revokeObjectURL(this.vistaPreviaImagen);
    }
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
    this.vistaPreviaImagen = this.editando?.imagenGusto || null;
  }

  protected async guardar(): Promise<void> {
    if (this.form.nombreGusto.trim().length < 2) {
      this.error.set('El nombre necesita al menos 2 caracteres.');
      return;
    }

    const enEdicion = this.editando;
    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    if (this.imagenSeleccionada) {
      if (enEdicion) {
        // Editando: sube imagen con ID existente
        this.subiendoImagen.set(true);
        this.usuariosService
          .subirImagenGusto(enEdicion.idGusto, this.imagenSeleccionada)
          .subscribe({
            next: (res) => {
              this.form.imagenGusto = res.imagenGusto;
              this.subiendoImagen.set(false);
              this.guardarGusto(enEdicion);
            },
            error: (err) => {
              this.procesando.set(false);
              this.subiendoImagen.set(false);
              this.error.set(mensajeDeError(err));
            },
          });
      } else {
        // Creando: primero crea el gusto, luego sube imagen con el nuevo ID
        this.usuariosService.crearGusto(this.form).subscribe({
          next: (gustoCreado) => {
            this.subiendoImagen.set(true);
            this.usuariosService
              .subirImagenGusto(gustoCreado.idGusto, this.imagenSeleccionada!)
              .subscribe({
                next: (res) => {
                  this.form.imagenGusto = res.imagenGusto;
                  this.subiendoImagen.set(false);
                  // Actualiza el gusto con la imagen
                  this.usuariosService.actualizarGusto(gustoCreado.idGusto, this.form).subscribe({
                    next: () => {
                      this.procesando.set(false);
                      this.formAbierto.set(false);
                      this.imagenSeleccionada = null;
                      if (this.vistaPreviaImagen && this.vistaPreviaImagen.startsWith('blob:')) {
                        URL.revokeObjectURL(this.vistaPreviaImagen);
                      }
                      this.vistaPreviaImagen = null;
                      this.exito.set('Gusto creado.');
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
          },
          error: (err) => {
            this.procesando.set(false);
            this.error.set(mensajeDeError(err));
          },
        });
      }
    } else {
      this.guardarGusto(enEdicion);
    }
  }

  private guardarGusto(enEdicion: Gusto | null): void {
    const operacion = enEdicion
      ? this.usuariosService.actualizarGusto(enEdicion.idGusto, this.form)
      : this.usuariosService.crearGusto(this.form);

    operacion.subscribe({
      next: (gustoCreado) => {
        this.procesando.set(false);
        this.formAbierto.set(false);
        this.imagenSeleccionada = null;
        if (this.vistaPreviaImagen && this.vistaPreviaImagen.startsWith('blob:')) {
          URL.revokeObjectURL(this.vistaPreviaImagen);
        }
        this.vistaPreviaImagen = null;
        this.exito.set(enEdicion ? 'Gusto actualizado.' : 'Gusto creado.');
        this.cargar();
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  protected confirmarEliminacion(): void {
    const gusto = this.porEliminar();
    if (!gusto) {
      return;
    }

    this.porEliminar.set(null);
    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    this.usuariosService.eliminarGusto(gusto.idGusto).subscribe({
      next: () => {
        this.procesando.set(false);
        this.exito.set(`«${gusto.nombreGusto}» dado de baja.`);
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

  /** Restaura un gusto dado de baja. */
  protected restaurar(gusto: Gusto): void {
    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    this.usuariosService.actualizarGusto(gusto.idGusto, { estado: EstadoGusto.Activo }).subscribe({
      next: () => {
        this.procesando.set(false);
        this.exito.set(`«${gusto.nombreGusto}» restaurado.`);
        this.cargar();
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  protected eliminarImagenGusto(gusto: Gusto): void {
    this.error.set('');
    this.exito.set('');
    this.procesando.set(true);

    this.usuariosService.eliminarImagenGusto(gusto.idGusto).subscribe({
      next: () => {
        this.procesando.set(false);
        this.exito.set('Imagen eliminada.');
        gusto.imagenGusto = null;
        if (this.editando?.idGusto === gusto.idGusto) {
          this.form.imagenGusto = '';
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
