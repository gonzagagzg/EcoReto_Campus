import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { insigniaDe } from '../../utils/estados';

/**
 * Etiqueta de estado normalizada. Le llega el valor crudo del backend
 * (EstadoReto, EstadoEvaluacion, EstadoUsuario, Rol o Dificultad) y arma la
 * insignia con el tono y el texto que le corresponden.
 *
 *   <app-insignia valor="Pendiente_Aprobacion" />
 */
@Component({
  selector: 'app-insignia',
  imports: [NgClass],
  template: `<span class="insignia" [ngClass]="'insignia--' + tono">{{ texto }}</span>`,
})
export class InsigniaComponent {
  @Input({ required: true }) valor = '';
  /** Sobrescribe la etiqueta cuando la vista quiere mostrar otro texto. */
  @Input() etiqueta = '';

  get tono(): string {
    return insigniaDe(this.valor).tono;
  }

  get texto(): string {
    return this.etiqueta || insigniaDe(this.valor).texto;
  }
}
