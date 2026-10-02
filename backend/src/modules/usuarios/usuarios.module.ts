import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosController } from './controllers/usuarios.controller';
import { USUARIO_DAO } from './daos/usuario.dao.interface';
import { UsuarioDao } from './daos/usuario.dao';
import { Gusto } from './entities/gusto.entity';
import { GustoUsuario } from './entities/gusto_usuario.entity';
import { Usuario } from './entities/usuario.entity';
import { UsuariosService } from './services/usuarios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Gusto, GustoUsuario])],
  controllers: [UsuariosController],
  providers: [UsuariosService, { provide: USUARIO_DAO, useClass: UsuarioDao }],
  exports: [USUARIO_DAO, UsuariosService, TypeOrmModule],
})
export class UsuariosModule {}
