import { Component, Input } from '@angular/core';

/** Indicador de carga bloqueante para listados y consultas. */
@Component({
  selector: 'app-loader',
  styleUrl: './loader.component.css',
  templateUrl: './loader.component.html',
})
export class LoaderComponent {
  @Input() texto = 'Cargando...';
}
