import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ParticipacionesService } from '../../../core/services/participaciones.service';
import { RetosService } from '../../../core/services/retos.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { mensajeDeError } from '../../../shared/utils/error-http';
import type { Reto } from '../../../core/models/reto.model';

const MAXIMO_BYTES = 5 * 1024 * 1024;

/**
 * Carga de evidencia fotográfica para un reto en el que la persona ya está
 * inscrita. El archivo viaja en multipart con el nombre 'evidencia'.
 */
@Component({
  selector: 'app-subir-evidencia',
  imports: [FormsModule, RouterLink, AlertaComponent, LoaderComponent],
  styleUrl: './subir-evidencia.component.css',
  templateUrl: './subir-evidencia.component.html',
})
export class SubirEvidenciaComponent {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly participaciones = inject(ParticipacionesService);
  private readonly retosService = inject(RetosService);

  private readonly idReto = Number(this.ruta.snapshot.paramMap.get('id'));

  protected reto = signal<Reto | null>(null);
  protected cargando = signal(true);
  protected error = signal('');
  protected enviado = signal(false);
  protected procesando = signal(false);

  protected archivo: File | null = null;
  protected vistaPrevia: string | null = null;
  protected comentario = '';

  constructor() {
    this.retosService.obtener(this.idReto).subscribe({
      next: (reto) => {
        this.reto.set(reto);
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

    this.error.set('');
    this.liberarVistaPrevia();

    if (!archivo) {
      this.archivo = null;
      return;
    }

    if (!archivo.type.startsWith('image/')) {
      this.archivo = null;
      input.value = '';
      this.error.set('Solo se aceptan imágenes (JPG, PNG o WebP).');
      return;
    }

    if (archivo.size > MAXIMO_BYTES) {
      this.archivo = null;
      input.value = '';
      this.error.set('La imagen supera los 5 MB permitidos.');
      return;
    }

    this.archivo = archivo;
    this.vistaPrevia = URL.createObjectURL(archivo);
  }

  protected quitar(): void {
    this.archivo = null;
    this.liberarVistaPrevia();
  }

  protected enviar(): void {
    if (!this.archivo) {
      this.error.set('Elige una imagen de tu evidencia.');
      return;
    }

    this.error.set('');
    this.procesando.set(true);

    this.participaciones
      .registrar({
        idReto: this.idReto,
        comentario: this.comentario.trim() || undefined,
        evidencia: this.archivo,
      })
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.enviado.set(true);
        },
        error: (err) => {
          this.procesando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  protected cancelar(): void {
    void this.router.navigate(['/retos', this.idReto]);
  }

  private liberarVistaPrevia(): void {
    if (this.vistaPrevia) {
      URL.revokeObjectURL(this.vistaPrevia);
      this.vistaPrevia = null;
    }
  }
}
