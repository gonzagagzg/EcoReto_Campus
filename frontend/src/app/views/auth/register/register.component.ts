import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { KeyValuePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { mensajeDeError } from '../../../shared/utils/error-http';
import type { Gusto } from '../../../core/models/gusto.model';

/**
 * Alta de cuenta. El backend acepta cualquier dominio de correo y
 * devuelve solo el alias: la cuenta queda en estado "pendiente" hasta que el
 * personal la active, por eso tras registrarse se invita a iniciar sesion.
 */
@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, AlertaComponent, KeyValuePipe],
  styleUrl: './register.component.css',
  templateUrl: './register.component.html',
})
export class RegisterComponent implements AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);

  @ViewChild('videoFondo') videoFondo!: ElementRef<HTMLVideoElement>;

  protected readonly logo = 'EcoRetoCampuslogoofi.png';

  protected nombre = '';
  protected apellido = '';
  protected correo = '';
  protected alias = '';
  protected cedula = '';
  protected contrasena = '';
  protected repetir = '';
  protected carrera = '';
  protected nivelCarrera = '';
  protected centroEstudios = '';

  protected catalogo = signal<Gusto[]>([]);
  protected seleccion = signal<number[]>([]);
  protected enviando = signal(false);
  protected error = signal('');
  protected aliasRegistrado = signal<string | null>(null);
  protected verContrasena = signal(false);
  protected showPasswordTooltip = signal(false);
  protected videoAutoplayFallido = signal(false);

  protected readonly passwordRequirements = signal<Record<string, boolean>>({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

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

  private validatePassword(password: string): void {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
    this.passwordRequirements.set(checks);
  }

  protected isPasswordValid(): boolean {
    return Object.values(this.passwordRequirements()).every((v) => v);
  }

  constructor() {
    this.usuarios.catalogoGustos().subscribe({
      next: (gustos: Gusto[]) => this.catalogo.set(gustos),
      error: () => this.catalogo.set([]),
    });
  }

  alternarGusto(idGusto: number): void {
    this.seleccion.update((actual: number[]) =>
      actual.includes(idGusto) ? actual.filter((id: number) => id !== idGusto) : [...actual, idGusto],
    );
  }

  enviar(): void {
    const vacios = [
      ['nombre', this.nombre],
      ['apellido', this.apellido],
      ['correo', this.correo],
      ['alias', this.alias],
      ['cedula', this.cedula],
      ['contraseña', this.contrasena],
    ] as const;

    const falta = vacios.find(([, valor]) => !valor.trim());

    if (falta) {
      this.error.set(`El campo ${falta[0]} es obligatorio.`);
      return;
    }

    if (this.contrasena !== this.repetir) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    if (!this.isPasswordValid()) {
      this.error.set(
        'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.',
      );
      return;
    }

    this.error.set('');
    this.enviando.set(true);

    this.auth
      .registrar({
        nombre: this.nombre.trim(),
        apellido: this.apellido.trim(),
        correo: this.correo.trim(),
        alias: this.alias.trim(),
        cedula: this.cedula.trim(),
        contrasena: this.contrasena,
        carrera: this.carrera.trim() || undefined,
        nivelCarrera: this.nivelCarrera.trim() || undefined,
        centroEstudios: this.centroEstudios.trim() || undefined,
        idsGustos: this.seleccion(),
      })
      .subscribe({
        next: (respuesta: { alias: string }) => this.aliasRegistrado.set(respuesta.alias),
        error: (err: unknown) => {
          this.enviando.set(false);
          this.error.set(mensajeDeError(err));
        },
      });
  }
}