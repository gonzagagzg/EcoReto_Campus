import { Directive, ElementRef, inject, HostListener } from '@angular/core';

/**
 * Oculta una imagen que no se pudo cargar (archivo borrado, 404, ruta
 * invalida). Asi el hueco queda limpio en vez de mostrar el icono roto del
 * navegador y, cuando el padre tiene un respaldo (iniciales del avatar,
 * inicial del gusto), se ve ese.
 *
 *   <img [src]="ruta | imagenUrl" appImagenRota />
 */
@Directive({ selector: 'img[appImagenRota]' })
export class ImagenRotaDirective {
  private readonly elemento = inject<ElementRef<HTMLImageElement>>(ElementRef);

  @HostListener('error')
  alFallar(): void {
    this.elemento.nativeElement.hidden = true;
  }
}
