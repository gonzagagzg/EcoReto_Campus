import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RetosService } from '../../core/services/retos.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { AlertaComponent } from '../../shared/components/alerta/alerta.component';
import { InsigniaComponent } from '../../shared/components/insignia/insignia.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { PaginacionComponent } from '../../shared/components/paginacion/paginacion.component';
import { ImagenRotaDirective } from '../../shared/directives/imagen-rota.directive';
import { ImagenUrlPipe } from '../../shared/pipes/imagen-url.pipe';
import { mensajeDeError } from '../../shared/utils/error-http';
import { Dificultad, EstadoReto, type Reto } from '../../core/models/reto.model';
import type { PerfilCompleto } from '../../core/models/usuario.model';

const CATEGORIAS = ['Reciclaje', 'Agua', 'Naturaleza'];

/**
 * Pantalla principal: barra de progreso de nivel y el feed de retos activos
 * con filtros por texto, categoría y dificultad.
 */
@Component({
  selector: 'app-inicio',
  imports: [
    FormsModule,
    RouterLink,
    AlertaComponent,
    InsigniaComponent,
    LoaderComponent,
    PaginacionComponent,
    ImagenUrlPipe,
    ImagenRotaDirective,
  ],
  styleUrl: './inicio.component.css',
  templateUrl: './inicio.component.html',
})
export class InicioComponent {
  private readonly retosService = inject(RetosService);
  private readonly usuariosService = inject(UsuariosService);
  protected readonly auth = inject(AuthService);

  protected readonly Dificultad = Dificultad;
  protected readonly categorias = CATEGORIAS;

  protected perfil = signal<PerfilCompleto | null>(null);
  protected items = signal<Reto[]>([]);
  protected total = signal(0);
  protected cargando = signal(true);
  protected error = signal('');

  protected busqueda = '';
  protected categoria = '';
  protected dificultad = '';
  protected pagina = 1;
  protected readonly limite = 9;

  constructor() {
    this.cargarPerfil();
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.retosService
      .listar({
        pagina: this.pagina,
        limite: this.limite,
        estadoReto: EstadoReto.Activo,
        busqueda: this.busqueda.trim() || undefined,
        categoria: this.categoria || undefined,
        dificultad: (this.dificultad as Dificultad) || undefined,
      })
      .subscribe({
        next: (respuesta) => {
          this.items.set(respuesta.items);
          this.total.set(respuesta.total);
          this.cargando.set(false);
        },
        error: (err) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }

  protected buscar(): void {
    this.pagina = 1;
    this.cargar();
  }

  protected limpiar(): void {
    this.busqueda = '';
    this.categoria = '';
    this.dificultad = '';
    this.buscar();
  }

  protected cambiarPagina(pagina: number): void {
    this.pagina = pagina;
    this.cargar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Fecha de cierre en formato corto, para no depender del locale. */
  protected fechaCorta(iso: string): string {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) {
      return iso;
    }
    return fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /** Avance hacia el siguiente nivel, o el texto de nivel máximo. */
  protected get progreso(): { porcentaje: number; nota: string } {
    const perfil = this.perfil();
    if (!perfil) {
      return { porcentaje: 0, nota: '' };
    }

    const { progresoNivel, retosRequeridosParaSiguienteNivel, retosCumplidos } =
      perfil.estadisticas;

    if (retosRequeridosParaSiguienteNivel === null) {
      return { porcentaje: 100, nota: '¡Nivel máximo alcanzado!' };
    }

    const faltan = retosRequeridosParaSiguienteNivel - retosCumplidos;

    return {
      porcentaje: progresoNivel,
      nota: `${retosCumplidos} reto${retosCumplidos === 1 ? '' : 's'} cumplido${retosCumplidos === 1 ? '' : 's'} · faltan ${faltan} para nivel ${perfil.nivel + 1}`,
    };
  }

  private cargarPerfil(): void {
    this.usuariosService.perfil().subscribe({
      next: (perfil) => this.perfil.set(perfil),
      error: () => this.perfil.set(null),
    });
  }
}
