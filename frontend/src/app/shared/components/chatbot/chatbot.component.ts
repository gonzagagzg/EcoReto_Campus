import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IaService } from '../../../core/services/ia.service';
import { mensajeDeError } from '../../utils/error-http';

interface MensajeChat {
  origen: 'yo' | 'ecocia';
  texto: string;
}

const SUGERENCIAS = [
  '¿Cuántos puntos tengo?',
  'Muéstrame los retos activos',
  '¿Qué premios puedo canjear?',
] as const;

/**
 * Burbuja flotante del asistente ECOCIA. Vive en el layout autenticado, asi
 * que aparece en toda la app menos en login y registro (rutas planas sin
 * layout). Habla con el backend (/gg/ia), que es quien consulta a Ollama.
 */
@Component({
  selector: 'app-chatbot',
  imports: [FormsModule],
  styleUrl: './chatbot.component.css',
  templateUrl: './chatbot.component.html',
})
export class ChatbotComponent {
  private readonly ia = inject(IaService);

  @ViewChild('listaMensajes') private listaMensajes?: ElementRef<HTMLElement>;

  protected readonly logo = '/IconoAsistenteIA.png';
  protected readonly sugerencias = SUGERENCIAS;

  protected abierto = signal(false);
  protected mensajes = signal<MensajeChat[]>([
    {
      origen: 'ecocia',
      texto: '¡Hola! Soy ECOCIA, tu asistente de EcoReto Campus. ¿En qué te ayudo?',
    },
  ]);
  protected pregunta = '';
  protected enviando = signal(false);
  protected habilitada = signal(true);
  protected disponible = signal(true);
  protected aviso = signal('');

  constructor() {
    this.ia.estado().subscribe({
      next: (estado) => {
        this.habilitada.set(estado.habilitada);
        this.disponible.set(estado.disponible);
        if (!estado.habilitada) {
          this.aviso.set('El asistente está desactivado en este momento.');
        } else if (!estado.disponible) {
          this.aviso.set('No pude conectar con el modelo de IA. Inténtalo más tarde.');
        }
      },
      error: () => {
        this.disponible.set(false);
        this.aviso.set('No hay conexión con el servidor. Inténtalo más tarde.');
      },
    });
  }

  protected alternar(): void {
    this.abierto.update((v) => !v);
    if (this.abierto()) {
      this.bajarAlFinal();
    }
  }

  protected usarSugerencia(texto: string): void {
    this.pregunta = texto;
    this.enviar();
  }

  protected enviar(): void {
    const texto = this.pregunta.trim();

    if (texto.length < 3 || this.enviando() || !this.puedePreguntar()) {
      return;
    }

    this.pregunta = '';
    this.mensajes.update((actual) => [...actual, { origen: 'yo', texto }]);
    this.enviando.set(true);
    this.bajarAlFinal();

    this.ia.preguntar(texto).subscribe({
      next: (respuesta) => {
        this.enviando.set(false);
        this.mensajes.update((actual) => [
          ...actual,
          { origen: 'ecocia', texto: respuesta.respuesta },
        ]);
        this.bajarAlFinal();
      },
      error: (err) => {
        this.enviando.set(false);
        this.mensajes.update((actual) => [
          ...actual,
          { origen: 'ecocia', texto: mensajeDeError(err) },
        ]);
        this.bajarAlFinal();
      },
    });
  }

  protected puedePreguntar(): boolean {
    return this.habilitada() && this.disponible();
  }

  private bajarAlFinal(): void {
    // Espera al repintado para que el scroll incluya el mensaje nuevo.
    setTimeout(() => {
      const lista = this.listaMensajes?.nativeElement;
      if (lista) {
        lista.scrollTop = lista.scrollHeight;
      }
    }, 50);
  }
}
