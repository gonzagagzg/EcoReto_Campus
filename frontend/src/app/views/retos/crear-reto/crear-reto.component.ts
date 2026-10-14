import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CATEGORIAS_RETO, type CategoriaReto } from '../../../core/constants/categorias-reto';
import { RetosService } from '../../../core/services/retos.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { mensajeDeError } from '../../../shared/utils/error-http';

/**
 * Formulario de creación de reto. El cliente solo manda nombre, descripción,
 * categoría, fecha límite e imagen opcional: dificultad y puntos los calcula
 * el backend a partir de la duración, y el reto nace en Pendiente_Aprobacion.
 */
@Component({
  selector: 'app-crear-reto',
  imports: [FormsModule, RouterLink, AlertaComponent],
  styleUrl: './crear-reto.component.css',
  templateUrl: './crear-reto.component.html',
})
export class CrearRetoComponent {
  private readonly retosService = inject(RetosService);
  private readonly router = inject(Router);

  protected readonly categorias = CATEGORIAS_RETO;

  protected nombreReto = '';
  protected descripcionReto = '';
  protected categoria: CategoriaReto = 'Reciclaje';
  protected fechaLimite = '';

  protected archivo: File | null = null;
  protected vistaPrevia: string | null = null;

  protected error = signal('');
  protected procesando = signal(false);

  /** El límite mínimo es mañana: la dificultad se calcula con la duración. */
  protected readonly minimo = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

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

    if (this.nombreReto.trim().length < 3) {
      fallos.push('El nombre necesita al menos 3 caracteres.');
    }
    if (this.descripcionReto.trim().length < 10) {
      fallos.push('La descripción necesita al menos 10 caracteres.');
    }
    if (this.categoria.trim().length < 3) {
      fallos.push('La categoría necesita al menos 3 caracteres.');
    }
    if (!this.fechaLimite) {
      fallos.push('Elige una fecha límite.');
    } else if (this.fechaLimite <= this.minimo) {
      fallos.push('La fecha límite debe ser posterior a hoy.');
    }

    if (fallos.length) {
      this.error.set(fallos.join(' '));
      return;
    }

    this.error.set('');
    this.procesando.set(true);

    this.retosService
      .crear({
        nombreReto: this.nombreReto.trim(),
        descripcionReto: this.descripcionReto.trim(),
        categoria: this.categoria.trim(),
        fechaLimite: `${this.fechaLimite}T23:59:59`,
        imagen: this.archivo ?? undefined,
      })
      .subscribe({
        next: (reto) => void this.router.navigate(['/retos', reto.idReto]),
        error: (err) => {
          this.procesando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  private liberarVistaPrevia(): void {
    if (this.vistaPrevia) {
      URL.revokeObjectURL(this.vistaPrevia);
      this.vistaPrevia = null;
    }
  }
}
