import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Control de paginación para los listados `{ items, total }` del backend.
 *
 *   <app-paginacion [pagina]="pagina" [limite]="limite" [total]="total"
 *                   (cambio)="pagina = $event; cargar()" />
 */
@Component({
  selector: 'app-paginacion',
  styleUrl: './paginacion.component.css',
  templateUrl: './paginacion.component.html',
})
export class PaginacionComponent {
  @Input({ required: true }) pagina = 1;
  @Input({ required: true }) limite = 10;
  @Input({ required: true }) total = 0;

  @Output() cambio = new EventEmitter<number>();

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total / this.limite));
  }

  get rangoInicial(): number {
    return this.total === 0 ? 0 : (this.pagina - 1) * this.limite + 1;
  }

  get rangoFinal(): number {
    return Math.min(this.total, this.pagina * this.limite);
  }

  anterior(): void {
    if (this.pagina > 1) {
      this.cambio.emit(this.pagina - 1);
    }
  }

  siguiente(): void {
    if (this.pagina < this.totalPaginas) {
      this.cambio.emit(this.pagina + 1);
    }
  }
}
