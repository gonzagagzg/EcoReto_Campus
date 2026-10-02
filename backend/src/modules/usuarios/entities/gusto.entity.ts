import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { GustoUsuario } from './gusto_usuario.entity';

export enum EstadoGusto {
  Activo = 'activo',
  Desactivo = 'desactivo',
}

@Entity('gustos')
export class Gusto {
  @PrimaryGeneratedColumn('increment', { name: 'id_gusto' })
  idGusto!: number;

  @Column({ name: 'nombre_gusto', type: 'varchar', length: 100 })
  nombreGusto!: string;

  @Column({ name: 'imagen_gusto', type: 'varchar', length: 255, nullable: true })
  imagenGusto!: string | null;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoGusto,
    enumName: 'estado_gusto_enum',
    default: EstadoGusto.Activo,
  })
  estado!: EstadoGusto;

  @OneToMany(() => GustoUsuario, (gustoUsuario) => gustoUsuario.gusto)
  usuariosGusto!: GustoUsuario[];
}
