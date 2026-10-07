import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { mensajeDeError } from '../../../shared/utils/error-http';

/** Acceso a la cuenta: pide correo institucional y contraseña. */
@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, AlertaComponent],
  styleUrl: './login.component.css',
  templateUrl: './login.component.html',
})
export class LoginComponent implements AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  @ViewChild('videoFondo') videoFondo!: ElementRef<HTMLVideoElement>;
  @ViewChild('btnPlay') btnPlay!: ElementRef<HTMLButtonElement>;

  protected readonly logo = 'EcoRetoCampuslogoofi.png';

  protected correo = '';
  protected contrasena = '';
  protected verContrasena = false;
  protected enviando = signal(false);
  protected error = signal('');
  protected videoAutoplayFallido = signal(false);

  ngAfterViewInit(): void {
    this.asegurarReproduccionVideo();
  }

  private async asegurarReproduccionVideo(): Promise<void> {
    const video = this.videoFondo?.nativeElement;
    if (!video) return;

    // Forzar propiedades criticas para autoplay
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = 'auto';

    try {
      await video.play();
      // Autoplay exitoso
      this.videoAutoplayFallido.set(false);
    } catch {
      // Autoplay bloqueado: mostrar boton de play
      this.videoAutoplayFallido.set(true);
    }
  }

  protected async reproducirVideo(): Promise<void> {
    const video = this.videoFondo?.nativeElement;
    if (!video) return;

    try {
      await video.play();
      this.videoAutoplayFallido.set(false);
    } catch {
      // Si falla, mantener boton visible
    }
  }

  enviar(): void {
    const correo = this.correo.trim();

    if (!correo || !this.contrasena) {
      this.error.set('Completa el correo y la contrasena.');
      return;
    }

    this.error.set('');
    this.enviando.set(true);

    this.auth.iniciarSesion({ correo, contrasena: this.contrasena }).subscribe({
      next: () => {
        const volver = this.ruta.snapshot.queryParamMap.get('returnUrl') ?? '/inicio';
        void this.router.navigateByUrl(volver);
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }
}