import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { EstadoIa, RespuestaIa } from '../models/ia.model';

/**
 * Consumo de /gg/ia (asistente ECOCIA con Ollama en el backend).
 *
 * El navegador nunca habla con Ollama directamente: el backend arma el
 * contexto segun el rol de la sesion y redirige la pregunta al modelo local.
 */
@Injectable({ providedIn: 'root' })
export class IaService {
  private readonly api = inject(ApiService);

  /** Dice si la IA esta activada en el backend y si el modelo responde. */
  estado(): Observable<EstadoIa> {
    return this.api.get('ia/estado');
  }

  /** Pregunta al asistente; el backend limita el contexto segun el rol. */
  preguntar(pregunta: string): Observable<RespuestaIa> {
    return this.api.post('ia/preguntar', { pregunta });
  }
}
