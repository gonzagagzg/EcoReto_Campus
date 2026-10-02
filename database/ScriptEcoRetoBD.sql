--Ver BDs
SELECT datname AS base_de_datos
FROM pg_database
WHERE datistemplate = false;

CREATE DATABASE ecoretobd;

-- ==========================================
-- 1. CREACIÓN DE TIPOS ENUM
-- ==========================================

CREATE TYPE rol_enum AS ENUM ('Usuario', 'Supervisor', 'Administrador');
CREATE TYPE estado_usuario_enum AS ENUM ('pendiente', 'activo', 'desactivo', 'bloqueado');
CREATE TYPE dificultad_enum AS ENUM ('Fácil', 'Medio', 'Difícil');
CREATE TYPE estado_reto_enum AS ENUM ('Pendiente_Aprobacion', 'Activo', 'Finalizado', 'Bloqueado', 'Negado', 'Desactivado');
CREATE TYPE estado_premio_enum AS ENUM ('activo', 'desactivo');
CREATE TYPE estado_gusto_enum AS ENUM ('activo', 'desactivo');


-- ==========================================
-- 2. TABLAS INDEPENDIENTES
-- ==========================================

-- Tabla: usuarios
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    alias VARCHAR(50) NOT NULL,
    carrera VARCHAR(100) NULL,
    nivel_carrera VARCHAR(50) NULL,
    centro_estudios VARCHAR(150) NULL,
    contrasena VARCHAR(255) NOT NULL,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    imagen_usuario VARCHAR(255) NULL,
    rol rol_enum NOT NULL DEFAULT 'Usuario',
    estado estado_usuario_enum NOT NULL DEFAULT 'pendiente',
    puntos INT NOT NULL DEFAULT 0 CHECK (puntos >= 0),
    historial_puntos INT NOT NULL DEFAULT 0 CHECK (historial_puntos >= 0),
    retos_cumplidos INT NOT NULL DEFAULT 0,
    nivel INT NOT NULL DEFAULT 0
);

-- Tabla: gustos
CREATE TABLE gustos (
    id_gusto SERIAL PRIMARY KEY,
    nombre_gusto VARCHAR(100) NOT NULL,
    descripcion_gusto VARCHAR(255) NULL,
    estado estado_gusto_enum NOT NULL DEFAULT 'activo',
    imagen_gusto VARCHAR(255) NULL
);

-- Tabla: premios
CREATE TABLE premios (
    id_premio SERIAL PRIMARY KEY,
    nombre_premio VARCHAR(150) NOT NULL,
    descripcion_premio TEXT NOT NULL,
    imagen_premio VARCHAR(255) NULL,
    puntos_premio INT NOT NULL CHECK (puntos_premio >= 0),
    estado estado_premio_enum NOT NULL DEFAULT 'activo'
);


-- ==========================================
-- 3. TABLAS DEPENDIENTES / RELACIONALES
-- ==========================================

-- Tabla: gustos_usuario
CREATE TABLE gustos_usuario (
    id_gusto_usuario SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_gusto INT NOT NULL,
    CONSTRAINT fk_gustos_usuario_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_gustos_usuario_gusto FOREIGN KEY (id_gusto) 
        REFERENCES gustos(id_gusto) ON DELETE CASCADE
);

-- Tabla: retos
CREATE TABLE retos (
    id_reto SERIAL PRIMARY KEY,
    id_usuario_creador INT NOT NULL,
    nombre_reto VARCHAR(150) NOT NULL,
    imagen_reto VARCHAR(255) NULL,
    descripcion_reto TEXT NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_limite TIMESTAMP NOT NULL,
    dificultad dificultad_enum NOT NULL,
    puntos_completado INT NOT NULL DEFAULT 0,
    puntos_participar INT NOT NULL DEFAULT 0,
    estado_reto estado_reto_enum NOT NULL DEFAULT 'Pendiente_Aprobacion',
    CONSTRAINT fk_retos_creador FOREIGN KEY (id_usuario_creador) 
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT chk_fecha_limite CHECK (fecha_limite > fecha_creacion)
);

-- Tabla: retos_participantes
CREATE TABLE retos_participantes (
    id_retos_participantes SERIAL PRIMARY KEY,
    id_reto INT NOT NULL,
    id_usuario INT NOT NULL,
    num_participacion INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_retos_part_reto FOREIGN KEY (id_reto) 
        REFERENCES retos(id_reto) ON DELETE CASCADE,
    CONSTRAINT fk_retos_part_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- Tabla: participacion_reto
CREATE TABLE participacion_reto (
    id_participacion SERIAL PRIMARY KEY,
    id_retos_participantes INT NOT NULL,
    id_usuario INT NOT NULL,
    imagen_evidencia VARCHAR(255) NOT NULL,
    estado_participacion estado_evaluacion_enum NOT NULL DEFAULT 'Enviado',
    id_usuario_revisor INT NULL,
    observacion_revision TEXT NULL,
    fecha_revision TIMESTAMP NULL,
    dias_cumplidos INT NULL CHECK (dias_cumplidos >= 0),
    CONSTRAINT fk_part_retos_participantes FOREIGN KEY (id_retos_participantes) 
        REFERENCES retos_participantes(id_retos_participantes) ON DELETE CASCADE,
    CONSTRAINT fk_part_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_part_revisor FOREIGN KEY (id_usuario_revisor) 
        REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- Tabla: soporte
CREATE TABLE soporte (
    id_soporte SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre_soporte VARCHAR(150) NOT NULL,
    detalle_soporte TEXT NOT NULL,
    imagenes_soporte VARCHAR(255) NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_atencion TIMESTAMP NULL,
    estado_soporte estado_evaluacion_enum NOT NULL DEFAULT 'Enviado',
    CONSTRAINT fk_soporte_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- Tabla: historial_premios
CREATE TABLE historial_premios (
    id_historial_premio SERIAL PRIMARY KEY,
    id_premio INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_canje TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_premio FOREIGN KEY (id_premio) 
        REFERENCES premios(id_premio) ON DELETE CASCADE,
    CONSTRAINT fk_historial_usuario FOREIGN KEY (id_usuario) 
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);


-- ==========================================
-- 4. DATOS DE PRUEBA 
-- ==========================================
-- Usuarios: 1 Administrador, 1 Supervisor y 3 Usuario.
-- TODOS los usuarios usan la misma contrasena: Prueba1234


TRUNCATE TABLE historial_premios, soporte, participacion_reto, retos_participantes,
    retos, gustos_usuario, gustos, premios, usuarios RESTART IDENTITY CASCADE;

-- Tabla: usuarios (contrasena de los 5 = Prueba1234)
-- puntos, retos_cumplidos y nivel son orientativos: la tarea programada `calculo-puntos`
-- los recalcula cada dia a las 04:00 liquidando solo los retos ya finalizados o vencidos,
-- y el nivel se deriva de retos cumplidos (nivel N requiere 2^N retos, tope 100).
INSERT INTO usuarios (id_usuario, nombre, apellido, correo, alias, carrera, nivel_carrera,
    centro_estudios, contrasena, cedula, imagen_usuario, rol, estado, puntos, historial_puntos, retos_cumplidos, nivel) VALUES
(1, 'Administrador', 'EcoReto', 'admin@ecoreto.campus', 'admin', 'Admin',
    'Admin', 'Admin', '$2b$10$S7E8OocQ5SqkP97R3aXNhe.Tu.kTyGn4RVUiuGwuHa2ORdaGiiy8m',
    '1000000001', 'usuarios/Fotos_perfil_usuario/1/1758900000000.jpg', 'Administrador', 'activo', 800,800, 4, 1),
(2, 'Carlos', 'Supervisor', 'supervisor@ecoreto.campus', 'carlos', 'Tecnologia en Analisis y Desarrollo de Software',
    'Octavo', 'Facultad de Ingenieria', '$2b$10$S7E8OocQ5SqkP97R3aXNhe.Tu.kTyGn4RVUiuGwuHa2ORdaGiiy8m',
    '1000000002', 'usuarios/Fotos_perfil_usuario/2/1758900000001.jpg', 'Supervisor', 'activo', 450,450, 2, 0),
(3, 'Ana', 'Perez', 'ana@ecoreto.campus', 'ana', 'Ingenieria Ambiental',
    'Cuarto', 'Facultad de Ciencias Ambientales', '$2b$10$S7E8OocQ5SqkP97R3aXNhe.Tu.kTyGn4RVUiuGwuHa2ORdaGiiy8m',
    '1000000003', 'usuarios/Fotos_perfil_usuario/3/1758900000002.jpg', 'Usuario', 'activo', 320,320, 1, 0),
(4, 'Luis', 'Ramos', 'luis@ecoreto.campus', 'luis', 'Administracion de Empresas',
    'Segundo', 'Facultad de Ciencias Administrativas', '$2b$10$S7E8OocQ5SqkP97R3aXNhe.Tu.kTyGn4RVUiuGwuHa2ORdaGiiy8m',
    '1000000004', 'usuarios/Fotos_perfil_usuario/4/1758900000003.jpg', 'Usuario', 'activo', 150,150, 1, 0),
(5, 'Sofia', 'Diaz', 'sofia@ecoreto.campus', 'sofia', 'Comunicacion Social',
    'Septimo', 'Facultad de Comunicacion', '$2b$10$S7E8OocQ5SqkP97R3aXNhe.Tu.kTyGn4RVUiuGwuHa2ORdaGiiy8m',
    '1000000005', NULL, 'Usuario', 'pendiente', 0, 0, 0);

-- Tabla: gustos
INSERT INTO gustos (id_gusto, nombre_gusto, descripcion_gusto, estado, imagen_gusto) VALUES
(1, 'Reciclaje', NULL, 'activo', 'gustos/reciclaje.png'),
(2, 'Ahorro de agua', NULL, 'activo', 'gustos/ahorro-agua.png'),
(3, 'Energia limpia', NULL, 'activo', 'gustos/energia-limpia.png'),
(4, 'Movilidad sostenible', NULL, 'activo', 'gustos/movilidad.png'),
(5, 'Comunidad', NULL, 'activo', 'gustos/comunidad.png');

-- Tabla: gustos_usuario
INSERT INTO gustos_usuario (id_gusto_usuario, id_usuario, id_gusto) VALUES
(1, 1, 1), (2, 2, 3), (3, 3, 1), (4, 4, 4), (5, 5, 5);

-- Tabla: retos (3 Activo, 1 Pendiente_Aprobacion, 1 Finalizado, 1 Negado)
-- Un reto Negado fue rechazado por el staff y NO aparece en el inicio del campus.
-- dificultad y puntos NO son libres: el servidor los deriva de (fecha_limite - fecha_creacion)
--   Facil  5..50 dias   -> 5 pts por cada 5 dias, tope 50
--   Medio  51..150      -> base 50, +50 por cada bloque de 50 dias extra, tope 150
--   Dificil 151..300    -> base 150, +50 por cada bloque de 50 dias extra, tope 300
--   puntos_participar   -> 25% de puntos_completado (redondeo al entero)
INSERT INTO retos (id_reto, id_usuario_creador, nombre_reto, imagen_reto, descripcion_reto,
    categoria, fecha_creacion, fecha_limite, dificultad, puntos_completado, puntos_participar, estado_reto) VALUES
-- 9 dias -> Facil -> floor(9/5)*5 = 5
(1, 3, 'Recoge 5 botellas de plastico', 'Imagenesretos/Retos/1/1758900000004.jpg',
    'Recolecta 5 botellas PET en los contenedores del campus y entregalas en el punto limpio.',
    'Reciclaje', NOW() - INTERVAL '2 days', NOW() + INTERVAL '7 days', 'Fácil', 5, 1, 'Activo'),
-- 60 dias -> Medio -> 50 + floor((60-50)/50)*50 = 50
(2, 4, 'Ahorra 20 litros de agua', 'Imagenesretos/Retos/2/1758900000005.jpg',
    'Registra durante dos meses el consumo de agua de tu residencia y demuestra el ahorro sostenido.',
    'Agua', NOW() - INTERVAL '1 day', NOW() + INTERVAL '59 days', 'Medio', 50, 13, 'Activo'),
-- 200 dias -> Dificil -> 150 + floor((200-150)/50)*50 = 200
(3, 1, 'Limpia el campus en equipo', NULL,
    'Organiza durante el semestre jornadas de limpieza de areas comunes y sube evidencia fotografica del antes y despues.',
    'Comunidad', NOW(), NOW() + INTERVAL '200 days', 'Difícil', 200, 50, 'Activo'),
-- 5 dias -> Facil -> floor(5/5)*5 = 5
(4, 5, 'Usa la bicicleta 5 veces', NULL,
    'Utiliza la bicicleta institucional o personal para ir a la facultad cinco veces esta semana.',
    'Movilidad', NOW(), NOW() + INTERVAL '5 days', 'Fácil', 5, 1, 'Pendiente_Aprobacion'),
-- 75 dias -> Medio -> 50 + floor((75-50)/50)*50 = 50
(5, 2, 'Siembra 3 arboles nativos', 'Imagenesretos/Retos/5/1758900000006.jpg',
    'Planta y cuidado durante el semestre arboles nativos en el jardin de la facultad y envia foto del antes y despues.',
    'Naturaleza', NOW() - INTERVAL '80 days', NOW() - INTERVAL '5 days', 'Medio', 50, 13, 'Finalizado'),
-- 15 dias -> Facil -> floor(15/5)*5 = 15; rechazado por el staff, no se muestra en el inicio
(6, 4, 'Usa el elevador todos los dias', NULL,
    'Registra durante dos semanas el uso del ascensor de la facultad en lugar de las escaleras.',
    'Movilidad', NOW() - INTERVAL '3 days', NOW() + INTERVAL '12 days', 'Fácil', 15, 4, 'Negado');

-- Tabla: retos_participantes
INSERT INTO retos_participantes (id_retos_participantes, id_reto, id_usuario, num_participacion) VALUES
(1, 1, 3, 1), (2, 1, 4, 2), (3, 2, 4, 1), (4, 3, 1, 1), (5, 5, 2, 1), (6, 1, 1, 3);

-- Tabla: participacion_reto (4 Aprobado, 1 Enviado, 1 Negado)
-- dias_cumplidos define el pago proporcional: 100% si cubrio los dias estimados, 50% si cubrio al menos
-- la mitad (minimo la mitad de los dias estimados) y 0% por debajo. NULL se trata como 100%.
INSERT INTO participacion_reto (id_participacion, id_retos_participantes, id_usuario,
    imagen_evidencia, estado_participacion, id_usuario_revisor, observacion_revision, fecha_revision, dias_cumplidos) VALUES
-- reto 1: 9 dias estimados, cumplio 9 -> 100% de 5 pts
(1, 1, 3, 'evidencias/1_1_1_3/1758900000007.jpg', 'Aprobado', 2,
    'Excelente evidencia, se contaron 8 botellas.', NOW() - INTERVAL '1 day', 9),
-- reto 1: 9 dias estimados, cumplio 4 (< mitad = 5) -> 0%
(2, 2, 4, 'evidencias/1_2_2_4/1758900000008.jpg', 'Negado', 2,
    'La foto no muestra la lectura del medidor.', NOW() - INTERVAL '2 days', 4),
-- reto 2: 60 dias estimados, cumplio 30 -> 50% de 50 pts
(3, 3, 4, 'evidencias/2_3_3_4/1758900000009.jpg', 'Aprobado', 2,
    'Cumplio la mitad del periodo, pago parcial.', NOW() - INTERVAL '2 days', 30),
-- reto 3: 200 dias estimados, cumplio 200 -> 100% de 200 pts
(4, 4, 1, 'evidencias/3_4_4_1/1758900000010.jpg', 'Aprobado', 2,
    'Buen trabajo en equipo durante todo el semestre.', NOW() - INTERVAL '12 hours', 200),
-- reto 5: 75 dias estimados, cumplio 75 -> 100% de 50 pts
(5, 5, 2, 'evidencias/5_5_5_2/1758900000011.jpg', 'Aprobado', 1,
    'Arboles sembrados y caredados.', NOW() - INTERVAL '4 days', 75),
-- enviado: aun sin revisar, por eso sin revisor, observacion, fecha ni dias_cumplidos
(6, 6, 1, 'evidencias/1_6_6_1/1758900000012.jpg', 'Enviado', NULL, NULL, NULL, NULL);

-- Tabla: premios
INSERT INTO premios (id_premio, nombre_premio, descripcion_premio, imagen_premio, puntos_premio) VALUES
(1, 'Bono de cafeteria', 'Cupo de cafe en la cafeteria del campus.', 'premios/bono-cafe.png', 150),
(2, 'Bolsa reutilizable', 'Bolsa ecologica firmada por EcoReto.', 'premios/bolsa.png', 120),
(3, 'Camiseta EcoReto', 'Camiseta oficial de la comunidad EcoReto.', 'premios/camiseta.png', 400),
(4, 'Descuento en libreria', '15% de descuento en la libreria universitaria.', 'premios/descuento.png', 250),
(5, 'Certificado de liderazgo', 'Certificado de participacion y liderazgo ambiental.', 'premios/certificado.png', 900);

-- Tabla: historial_premios (5 canjes)
INSERT INTO historial_premios (id_historial_premio, id_premio, id_usuario, fecha_canje) VALUES
(1, 1, 3, NOW() - INTERVAL '10 days'),
(2, 3, 3, NOW() - INTERVAL '8 days'),
(3, 2, 4, NOW() - INTERVAL '6 days'),
(4, 4, 4, NOW() - INTERVAL '3 days'),
(5, 5, 2, NOW() - INTERVAL '1 day');

-- Tabla: soporte (3 Enviado, 1 Aprobado, 1 Negado)
INSERT INTO soporte (id_soporte, id_usuario, nombre_soporte, detalle_soporte, imagenes_soporte,
    fecha_creacion, fecha_atencion, estado_soporte) VALUES
(1, 3, 'No puedo subir evidencia', 'Al intentar enviar mi evidencia del reto de botellas me sale un error 413.',
    'soporte/1/1758900000012.jpg', NOW() - INTERVAL '2 days', NULL, 'Enviado'),
(2, 4, 'Error al iniciar sesion', 'Al iniciar sesion la aplicacion se queda cargando y luego se cierra.',
    NULL, NOW() - INTERVAL '1 day', NULL, 'Enviado'),
(3, 1, 'Solicitud de datos de prueba', 'Confirmacion de que el usuario administrador quedo activo con permisos completos.',
    NULL, NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days', 'Aprobado'),
(4, 2, 'Consulta de puntos', 'El usuario 4 solicita la tabla de puntos que genera la tarea programada.',
    NULL, NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', 'Negado'),
(5, 5, 'Cambio de correo institucional', 'Solicito cambiar mi correo de la universidad por uno personal.',
    'soporte/5/1758900000013.jpg', NOW() - INTERVAL '5 hours', NULL, 'Enviado');

-- Ajusta las secuencias para que los proximos INSERT no choquen con los id fijos
SELECT setval(pg_get_serial_sequence('usuarios', 'id_usuario'), (SELECT MAX(id_usuario) FROM usuarios));
SELECT setval(pg_get_serial_sequence('gustos', 'id_gusto'), (SELECT MAX(id_gusto) FROM gustos));
SELECT setval(pg_get_serial_sequence('gustos_usuario', 'id_gusto_usuario'), (SELECT MAX(id_gusto_usuario) FROM gustos_usuario));
SELECT setval(pg_get_serial_sequence('retos', 'id_reto'), (SELECT MAX(id_reto) FROM retos));
SELECT setval(pg_get_serial_sequence('retos_participantes', 'id_retos_participantes'), (SELECT MAX(id_retos_participantes) FROM retos_participantes));
SELECT setval(pg_get_serial_sequence('participacion_reto', 'id_participacion'), (SELECT MAX(id_participacion) FROM participacion_reto));
SELECT setval(pg_get_serial_sequence('premios', 'id_premio'), (SELECT MAX(id_premio) FROM premios));
SELECT setval(pg_get_serial_sequence('historial_premios', 'id_historial_premio'), (SELECT MAX(id_historial_premio) FROM historial_premios));
SELECT setval(pg_get_serial_sequence('soporte', 'id_soporte'), (SELECT MAX(id_soporte) FROM soporte));


-- ==========================================
-- 5. SELECT * DE CADA TABLA
-- ==========================================
SELECT * FROM usuarios;
SELECT * FROM gustos;
SELECT * FROM gustos_usuario;
SELECT * FROM retos;
SELECT * FROM retos_participantes;
SELECT * FROM participacion_reto;
SELECT * FROM premios;
SELECT * FROM historial_premios;
SELECT * FROM soporte;


