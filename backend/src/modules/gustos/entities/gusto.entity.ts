import {
  Check,
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum EstadoGusto {
  Activo = 'activo',
  Desactivo = 'desactivo',
}

@Entity('gustos')
export class Gusto {
  @PrimaryGeneratedColumn('increment', { name: 'id_gusto' })
  idGusto!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ name: 'descripcion', type: 'varchar', length: 255, nullable: true })
  descripcion!: string | null;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoGusto,
    enumName: 'estado_gusto_enum',
  })
  estado!: EstadoGusto;

  @Column({ name: 'fecha_creacion', type: 'timestamptz', default: 'CURRENT_TIMESTAMP' })
  fechaCreacion!: Date;
}