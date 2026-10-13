import { Pipe, PipeTransform, inject } from '@angular/core';
import { ConfigService } from '../../core/services/config.service';

/**
 * Convierte una ruta relativa devuelta por el backend
 * (ej: "retos/3/reto.png") en la url absoluta de /uploads.
 *
 * Si la ruta ya es absoluta o un data URI se devuelve tal cual, y si viene
 * vacia se devuelve null para que la vista pueda pintar un hueco.
 */
@Pipe({ name: 'imagenUrl', standalone: true })
export class ImagenUrlPipe implements PipeTransform {
  private readonly config = inject(ConfigService);

  transform(ruta: string | null | undefined): string | null {
    if (!ruta) {
      return null;
    }

    if (/^(https?:)?\/\//i.test(ruta) || ruta.startsWith('data:')) {
      return ruta;
    }

    return `${this.config.uploadsUrl}/${ruta.replace(/^\/+/, '')}`;
  }
}
