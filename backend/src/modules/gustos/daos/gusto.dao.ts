import { Repository, DataSource } from 'typeorm';
import { Gusto, EstadoGusto } from '../entities/gusto.entity';

export class GustoDao extends Repository<Gusto> {
  constructor(private readonly dataSource: DataSource) {
    super(Gusto, dataSource.createEntityManager());
  }

  async listar(estado?: string): Promise<Gusto[]> {
    const where = estado ? { estado: estado as any } : {};
    return this.find({ where });
  }

  async buscarPorId(id: number): Promise<Gusto | null> {
    return this.findOne({ where: { idGusto: id } });
  }

  async crear(dato: { nombre: string; descripcion?: string; estado?: 'activo' | 'desactivo' }): Promise<Gusto> {
    const gusto = new Gusto();
    gusto.nombre = dato.nombre;
    if (dato.descripcion !== undefined) {
      gusto.descripcion = dato.descripcion;
    }
    gusto.estado = dato.estado === 'desactivo' ? EstadoGusto.Desactivo : EstadoGusto.Activo;
    return this.save(gusto);
  }

  async actualizar(id: number, datos: { nombre?: string; descripcion?: string; estado?: 'activo' | 'desactivo' }): Promise<Gusto | null> {
    const gusto = await this.findOne({ where: { idGusto: id } });
    if (!gusto) {
      return null;
    }

    if (datos.nombre !== undefined) {
      gusto.nombre = datos.nombre;
    }
    if (datos.descripcion !== undefined) {
      gusto.descripcion = datos.descripcion;
    }
    if (datos.estado !== undefined) {
      gusto.estado = datos.estado === 'desactivo' ? EstadoGusto.Desactivo : EstadoGusto.Activo;
    }

    return this.save(gusto);
  }

  async eliminar(id: number): Promise<boolean> {
    const resultado = await this.delete(id);
    return resultado.affected! > 0;
  }
}