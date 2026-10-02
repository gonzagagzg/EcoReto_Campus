import {
  Check,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HistorialPremio } from './historial_premio.entity';

/** Mismos valores que EstadoUsuario: 'desactivo' es la baja logica del catalogo. */
export enum EstadoPremio {
  Activo = 'activo',
  Desactivo = 'desactivo',
}

@Entity('premios')
@Check('premios_puntos_premio_check', 'puntos_premio >= 0')
export class Premio {
  @PrimaryGeneratedColumn('increment', { name: 'id_premio' })
  idPremio!: number;

  @Column({ name: 'nombre_premio', type: 'varchar', length: 150 })
  nombrePremio!: string;

  @Column({ name: 'descripcion_premio', type: 'text' })
  descripcionPremio!: string;

  @Column({
    name: 'imagen_premio',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  imagenPremio!: string | null;

  @Column({ name: 'puntos_premio', type: 'int' })
  puntosPremio!: number;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoPremio,
    enumName: 'estado_premio_enum',
    default: EstadoPremio.Activo,
  })
  estado!: EstadoPremio;

  @OneToMany(() => HistorialPremio, (historial) => historial.premio)
  canjes!: HistorialPremio[];
}
