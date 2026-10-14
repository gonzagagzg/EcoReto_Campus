import { join } from 'node:path';
import { esCarpetaBorradoSegura, uploadsRoot } from './uploads.config';

describe('esCarpetaBorradoSegura', () => {
  it('rechaza la raiz de uploads', () => {
    expect(esCarpetaBorradoSegura(uploadsRoot())).toBe(false);
    expect(esCarpetaBorradoSegura(join(uploadsRoot(), '.'))).toBe(false);
  });

  it('rechaza rutas que escapan de uploads', () => {
    expect(esCarpetaBorradoSegura(join(uploadsRoot(), '..'))).toBe(false);
    expect(esCarpetaBorradoSegura(join(uploadsRoot(), 'evidencias', '..', '..'))).toBe(false);
  });

  it('acepta subcarpetas reales dentro de uploads', () => {
    expect(esCarpetaBorradoSegura(join(uploadsRoot(), 'evidencias', '7_29_49_7'))).toBe(true);
    expect(esCarpetaBorradoSegura(join(uploadsRoot(), 'Imagenesretos', 'Retos', '7'))).toBe(true);
  });
});
