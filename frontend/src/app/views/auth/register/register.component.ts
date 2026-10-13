import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { KeyValuePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { mensajeDeError, mensajesDeError } from '../../../shared/utils/error-http';
import type { Gusto } from '../../../core/models/gusto.model';

type CampoRegistro = 'nombre' | 'apellido' | 'correo' | 'alias' | 'cedula' | 'contrasena' | 'repetir';
type ErroresRegistro = Partial<Record<CampoRegistro, string>>;

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
  protected errores = signal<ErroresRegistro>({});
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

  protected validatePassword(password: string): void {
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

  protected limpiarError(campo: CampoRegistro): void {
    if (!this.errores()[campo]) return;
    this.errores.update((actual) => {
      const copia = { ...actual };
      delete copia[campo];
      return copia;
    });
  }

  private hayErroresDeCampo(errores: ErroresRegistro): boolean {
    return Object.keys(errores).length > 0;
  }

  /** Reparte cada mensaje del backend en su campo (correo / cédula / alias / ...). */
  private aplicarErroresDeBackend(mensajes: string[]): boolean {
    const porCampo: ErroresRegistro = { ...this.errores() };

    for (const original of mensajes) {
      const texto = original.toLowerCase();
      let asignado = false;

      // Cada `if` es independiente: "el correo y la cedula ya estan..."
      // debe marcar los dos campos a la vez.
      if (texto.includes('correo') || texto.includes('email')) {
        porCampo['correo'] = original;
        asignado = true;
      }
      if (texto.includes('cedula') || texto.includes('cédula')) {
        porCampo['cedula'] = original;
        asignado = true;
      }
      if (texto.includes('alias')) {
        porCampo['alias'] = original;
        asignado = true;
      }
      if (texto.includes('contrasena') || texto.includes('contraseña') || texto.includes('password')) {
        porCampo['contrasena'] = original;
        asignado = true;
      }
      if (texto.includes('nombre') && !texto.includes('apellido')) {
        porCampo['nombre'] = original;
        asignado = true;
      }
      if (texto.includes('apellido')) {
        porCampo['apellido'] = original;
        asignado = true;
      }

      if (!asignado) {
        this.error.set(this.error() ? `${this.error()} · ${original}` : original);
      }
    }

    this.errores.set(porCampo);
    return this.hayErroresDeCampo(porCampo);
  }

  private mensajesDelBackend(err: unknown): string[] {
    // Delega en error-http: ademas de los mensajes de validacion del backend,
    // oculta los tecnicismos (red caida, 5xx) que no le sirven a la persona.
    return mensajesDeError(err);
  }

  enviar(): void {
    // Errores independientes por campo: se muestran todos a la vez,
    // no solo el primero que falle.
    const porCampo: ErroresRegistro = {};

    if (!this.nombre.trim()) porCampo['nombre'] = 'El nombre es obligatorio.';
    if (!this.apellido.trim()) porCampo['apellido'] = 'El apellido es obligatorio.';
    if (!this.correo.trim()) {
      porCampo['correo'] = 'El correo es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo.trim())) {
      porCampo['correo'] = 'Ingresa un correo válido.';
    }
    if (!this.cedula.trim()) porCampo['cedula'] = 'La cédula es obligatoria.';
    if (!this.alias.trim()) porCampo['alias'] = 'El alias es obligatorio.';
    if (!this.contrasena) {
      porCampo['contrasena'] = 'La contraseña es obligatoria.';
    } else if (!this.isPasswordValid()) {
      porCampo['contrasena'] =
        'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.';
    }
    if (!this.repetir) {
      porCampo['repetir'] = 'Repite tu contraseña.';
    } else if (this.contrasena !== this.repetir) {
      porCampo['repetir'] = 'Las contraseñas no coinciden.';
    }

    this.errores.set(porCampo);
    this.error.set('');

    if (this.hayErroresDeCampo(porCampo)) {
      return;
    }

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
          this.error.set('');
          const mapeado = this.aplicarErroresDeBackend(this.mensajesDelBackend(err));
          if (!mapeado && !this.error()) {
            this.error.set(mensajeDeError(err));
          }
        },
      });
  }
}