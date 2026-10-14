
export function dominiosInstitucionales(): string[] {
  return (process.env.CORREO_DOMINIOS_INSTITUCIONALES ?? '')
    .split(',')
    .map((dominio) => dominio.trim().toLowerCase())
    .filter((dominio) => dominio.length > 0);
}

export function esCorreoInstitucional(correo: string): boolean {
  const dominios = dominiosInstitucionales();

  // Si no hay dominios configurados, permite cualquier correo (modo abierto)
  if (dominios.length === 0) {
    return true;
  }

  const dominio = correo.trim().toLowerCase().split('@')[1] ?? '';

  return dominios.includes(dominio);
}
