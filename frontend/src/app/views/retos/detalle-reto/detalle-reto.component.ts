import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RetosService } from '../../../core/services/retos.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { InsigniaComponent } from '../../../shared/components/insignia/insignia.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ImagenRotaDirective } from '../../../shared/directives/imagen-rota.directive';
import { ImagenUrlPipe } from '../../../shared/pipes/imagen-url.pipe';
import { mensajeDeError } from '../../../shared/utils/error-http';
import type { RetoParticipante } from '../../../core/models/participacion.model';
import { EstadoReto, type Reto } from '../../../core/models/reto.model';

/**
 * Ficha completa de un reto. Carga el reto y la lista de participantes para
 * saber en el cliente si la persona ya se inscribió, así el botón cambia a
 * "subir evidencia" sin tener que esperar un error 409 del backend.
 */
@Component({
  selector: 'app-detalle-reto',
  imports: [
    RouterLink,
    AlertaComponent,
    InsigniaComponent,
    LoaderComponent,
    ImagenRotaDirective,
    ImagenUrlPipe,
  ],
  styleUrl: './detalle-reto.component.css',
  templateUrl: './detalle-reto.component.html',
})
export class DetalleRetoComponent {
  private readonly ruta = inject(ActivatedRoute);
  private readonly retosService = inject(RetosService);
  private readonly auth = inject(AuthService);

  private readonly idReto = Number(this.ruta.snapshot.paramMap.get('id'));

  protected reto = signal<Reto | null>(null);
  protected participantes = signal(0);
  protected inscripto = signal(false);
  protected cargando = signal(true);
  protected error = signal('');
  protected aviso = signal('');
  protected procesando = signal(false);

  constructor() {
    this.cargar();
  }

  protected get yaParticipo(): boolean {
    return this.inscripto();
  }

  protected participar(): void {
    if (this.procesando()) {
      return;
    }

    this.error.set('');
    this.aviso.set('');
    this.procesando.set(true);

    this.retosService.participar(this.idReto).subscribe({
      next: () => {
        this.procesando.set(false);
        this.inscripto.set(true);
        this.participantes.update((total) => total + 1);
        this.aviso.set('¡Inscripción lista! Ahora subí tu evidencia para sumar los puntos.');
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  protected fecha(iso: string): string {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) {
      return iso;
    }
    return fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  private cargar(): void {
    this.cargando.set(true);

    this.retosService.obtener(this.idReto).subscribe({
      next: (reto) => {
        this.reto.set(reto);
        this.cargarParticipantes();
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }

  private cargarParticipantes(): void {
    const idUsuario = this.auth.idUsuario();

    this.retosService.participantes(this.idReto).subscribe({
      next: (lista: RetoParticipante[]) => {
        this.participantes.set(lista.length);
        this.inscripto.set(idUsuario !== null && lista.some((p) => p.idUsuario === idUsuario));
        this.cargando.set(false);
      },
      error: () => {
        // Sin la lista seguimos mostrando el reto, solo cambia el botón.
        this.cargando.set(false);
      },
    });
  }

  protected get activo(): boolean {
    return this.reto()?.estadoReto === EstadoReto.Activo;
  }
}
