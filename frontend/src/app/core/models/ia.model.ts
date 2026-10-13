/** Respuesta de GET /gg/ia/estado: si la IA esta activa y si Ollama responde. */
export interface EstadoIa {
  habilitada: boolean;
  modelo: string;
  disponible: boolean;
}

/** Respuesta de POST /gg/ia/preguntar. */
export interface RespuestaIa {
  respuesta: string;
  modelo: string;
}
