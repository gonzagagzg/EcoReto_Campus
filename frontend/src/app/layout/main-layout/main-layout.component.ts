import { Component, signal, HostListener, inject, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ChatbotComponent } from '../../shared/components/chatbot/chatbot.component';
import { AuthService } from '../../core/services/auth.service';

/**
 * Estructura fija de la aplicacion autenticada: barra superior, navegacion
 * lateral, router-outlet de views/ y la burbuja del asistente ECOCIA.
 * Login y registro no usan este layout, asi que el chatbot no aparece ahi.
 */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, ChatbotComponent],
  styleUrl: './main-layout.component.css',
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  sidebarAbierto = signal(false);

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 900) {
      this.cerrarSidebar();
    }
  }

  toggleSidebar() {
    this.sidebarAbierto.update((v) => !v);
    this.sincronizarScrollFondo();
  }

  cerrarSidebar() {
    this.sidebarAbierto.set(false);
    this.sincronizarScrollFondo();
  }

  /** Evita que la pagina de detras se desplace con el cajón móvil abierto. */
  private sincronizarScrollFondo(): void {
    document.body.classList.toggle('menu-abierto', this.sidebarAbierto());
  }

  ngOnDestroy(): void {
    document.body.classList.remove('menu-abierto');
  }

  /** Watermark visible solo si hay sesión activa. */
  protected mostrarWatermark(): boolean {
    return this.auth.autenticado();
  }
}
