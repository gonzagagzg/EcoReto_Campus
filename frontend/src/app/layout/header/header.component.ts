import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UsuariosService } from '../../core/services/usuarios.service';

/**
 * Barra superior: marca con el logo, HUD de puntos y nivel de la sesion
 * activa, y salida. Los puntos los trae una sola vez al montar el layout,
 * ya que este componente no se destruye al navegar entre vistas.
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink],
  styleUrl: './header.component.css',
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  @Output() toggleMenu = new EventEmitter<void>();

  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly usuarios = inject(UsuariosService);

  protected readonly puntos = signal<number | null>(null);
  protected readonly nivel = signal<number | null>(null);
  protected readonly logo = 'EcoRetoCampuslogoofi.png';

  constructor() {
    if (!this.auth.autenticado()) {
      return;
    }

    this.usuarios.perfil().subscribe({
      next: (perfil) => {
        this.puntos.set(perfil.puntos);
        this.nivel.set(perfil.nivel);
      },
      error: () => {
        // Sin perfil el HUD simplemente no muestra los contadores.
      },
    });
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigate(['/login']);
  }

  emitirToggleMenu(): void {
    this.toggleMenu.emit();
  }
}
