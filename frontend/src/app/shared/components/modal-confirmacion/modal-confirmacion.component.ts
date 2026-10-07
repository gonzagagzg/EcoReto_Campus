import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Diálogo de confirmación. El padre decide cuándo montarlo:
 *
 *   @if (porEliminar) {
 *     <app-modal-confirmacion
 *       titulo="Eliminar reto"
 *       mensaje="Esta acción no se puede deshacer."
 *       (confirmar)="eliminar()" (cancelar)="porEliminar = null" />
 *   }
 */
@Component({
  selector: 'app-modal-confirmacion',
  styleUrl: './modal-confirmacion.component.css',
  templateUrl: './modal-confirmacion.component.html',
})
export class ModalConfirmacionComponent {
  @Input({ required: true }) titulo = 'Confirmar';
  @Input() mensaje = '';
  @Input() textoConfirmar = 'Confirmar';
  @Input() textoCancelar = 'Cancelar';
  @Input() peligro = true;

  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
}
