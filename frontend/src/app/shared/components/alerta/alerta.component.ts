import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

export type TipoAlerta = 'ok' | 'error' | 'info' | 'aviso';

const ICONOS: Record<TipoAlerta, string> = {
  ok: '\u2713',
  error: '\u2715',
  info: '\u2139',
  aviso: '!',
};

/** Aviso en linea para confirmar acciones o mostrar el error del backend. */
@Component({
  selector: 'app-alerta',
  imports: [NgClass],
  styleUrl: './alerta.component.css',
  templateUrl: './alerta.component.html',
})
export class AlertaComponent {
  @Input({ required: true }) mensaje = '';
  @Input() tipo: TipoAlerta = 'info';

  get icono(): string {
    return ICONOS[this.tipo];
  }
}
