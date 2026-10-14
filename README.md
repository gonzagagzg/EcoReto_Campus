# EcoReto Campus

Plataforma web + móvil para gamificar el cuidado ambiental en el campus: los estudiantes cumplen **retos ecológicos**, suben **evidencia fotográfica**, ganan **puntos y niveles**, y canjean **premios**. Supervisores y administradores revisan, aprueban y gestionan todo el ciclo.

## Problema que resuelve

- Baja participación en actividades ambientales del campus por falta de incentivos visibles.
- No hay un registro verificable de acciones sostenibles (reciclaje, ahorro de agua, energía limpia, etc.).
- La gestión de retos, evidencias, premios y soporte se hacía dispersa / manual.
- Falta de ranking y reconocimiento que motive la constancia.

EcoReto centraliza todo: publicación de retos, participación con evidencia, revisión por supervisores, puntos, clasificación, premios y soporte.

## Objetivo

Fomentar hábitos sostenibles mediante gamificación:

1. Cualquier estudiante crea o se une a retos por categoría, dificultad y fecha límite.
2. Sube evidencia fotográfica de su participación.
3. Supervisores aprueban/niegan con observaciones; el sistema otorga puntos.
4. Los puntos suben nivel, alimentan la clasificación y se canjean por premios.
5. Administración gestiona usuarios, retos, premios, gustos, soporte e historial.

## Tecnologías utilizadas

**Backend (`backend/`)**

- Node.js v24 + npm v11
- NestJS 12 + TypeScript 6, `ValidationPipe` global, filtro global de excepciones
- PostgreSQL 15+ + TypeORM 1 + `pg`
- Auth JWT access + refresh (`@nestjs/jwt`, `bcrypt`, `class-validator/transformer`)
- Subida de archivos local con Multer/Express (`/uploads`)
- Tareas programadas (`@nestjs/schedule`)
- Configuración validada (`@nestjs/config` + `env.validation.ts`)
- Tests: Jest 30 + Supertest, lint: oxlint, formato: Prettier

**Frontend (`frontend/`)**

- Angular 22 + TypeScript 6, standalone components + lazy loading
- Capacitor 8 (`@capacitor/core/android/ios`, `camera`, `filesystem`, `network`) — App ID `com.ecoreto.campus`
- RxJS 7, `public/config.json` runtime + `src/environments/environment.ts` generado por `scripts/load-env.mjs`
- Failover automático de backends (`BACKEND_HOST` + `BACKENDS`)
- Tests: Vitest 5 + jsdom, formato: Prettier

**Base de datos (`database/`)**

- PostgreSQL, script `ScriptEcoRetoBD.sql` (tipos ENUM, tablas `usuarios`, `retos`, `participacion_reto`, `premios`, `gustos`, `soporte`, etc.)

## Instalación / ejecución

### Requisitos

- Node.js 24+ y npm 11+
- PostgreSQL 15+ corriendo en local
- (Opcional móvil) Android Studio / Xcode + `npx cap` para Capacitor

### 1. Clonar e instalar

```powershell
git clone https://github.com/gonzagagzg/EcoReto_Campus.git
Set-Location EcoReto_Campus

# Backend
Set-Location backend; npm install; Set-Location ..

# Frontend
Set-Location frontend; npm install; Set-Location ..
```

### 2. Base de datos

```powershell
# Crear BD y aplicar esquema
createdb ecoretobd
psql -d ecoretobd -f database/ScriptEcoRetoBD.sql
```

> `backend` usa `DB_SYNCHRONIZE=false` por defecto: el esquema lo manda el `.sql`, no TypeORM.

### 3. Variables de entorno

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

- `backend/.env`: ajusta `DB_PASSWORD`, genera `JWT_SECRET` / `JWT_REFRESH_SECRET`:
  ```powershell
  node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
  ```
  Revisa `PORT`, `CORS_ORIGINS` (incluye `http://localhost:4200`, `:8100`, orígenes Capacitor y tu túnel `xxxx-4200...` si usas devtunnel).
- `frontend/.env`: ajusta `BACKEND_HOST` (ej. `http://localhost:3000`), deja `BACKEND_PORT` vacío con URLs completas, y `BACKENDS` para respaldos. `API_PREFIX=gg` debe coincidir con `setGlobalPrefix('gg')` del backend.

### 4. Ejecutar en desarrollo

```powershell
# Terminal 1 — API en http://localhost:3000/gg
Set-Location backend; npm run start:dev

# Terminal 2 — Web en http://localhost:4200
Set-Location frontend; npm start
```

`npm start` en frontend primero ejecuta `node scripts/load-env.mjs`, que genera `src/environments/environment.ts` y `public/config.json`. Para cambiar de backend sin recompilar, edita el `config.json` desplegado (`dist/frontend/browser/config.json`) y recarga.

### 5. Build y móvil

```powershell
Set-Location frontend
npm run build
npx cap sync
npx cap open android   # o: npx cap open ios
```

### 6. Tests y lint

```powershell
Set-Location backend; npm test; npm run lint
Set-Location ..\frontend; npm test
```

## Capturas

| Vista | Captura |
|---|---|
| Login / Registro | `docs/capturas/login.png` |
| Login / Registro | `docs/capturas/registro.png` |
| Inicio | `docs/capturas/inicio.png` |
| Detalle de reto + subir evidencia | `docs/capturas/reto-detalle.png` |
| Premios / canje | `docs/capturas/premios.png` |
| Clasificación | `docs/capturas/clasificacion.png` |
| Panel supervisor | `docs/capturas/supervisor.png` |
| Panel admin | `docs/capturas/admin.png` |
| App móvil (Capacitor) | `docs/capturas/movil.png` |



## Funcionalidades

**Estudiante (Rol `Usuario`)**

- Registro/login con correo institucional (`CORREO_DOMINIOS_INSTITUCIONALES`) y JWT con refresh.
- Crear retos (categoría: Reciclaje, Ahorro de agua, Energía limpia, Movilidad sostenible, Naturaleza, Comunidad, Consumo responsable, Educación ambiental; dificultad Fácil/Medio/Difícil; puntos por participar/completar; fecha límite).
- Ver detalle, unirse y subir evidencia fotográfica (`imagen_evidencia`).
- Mis participaciones con estados `Enviado/Aprobado/Negado/Bloqueado` + observaciones del revisor.
- Puntos, `historial_puntos`, `retos_cumplidos`, nivel y clasificación general.
- Catálogo de premios y canje (`pendiente/listo para reclamar/reclamado/negado/bloqueado`).
- Perfil público/privado, editar datos, foto, mis gustos ambientales.
- Tickets de soporte (`Enviado/Aprobado/Negado/Bloqueado`).

**Supervisor**

- Cola de evidencias y retos `Pendiente_Aprobacion`: aprobar/negar con observación, bloquear.
- Historial de revisiones.

**Administrador**

- Tablero resumen, gestión de usuarios (activar/desactivar/bloquear, roles), retos, premios, premios canjeados, gustos, soporte e historial de registros.

**Transversales**

- Prefijo global API `/gg` (`http://localhost:3000/gg`), archivos en `/uploads`.
- CORS configurable multi-origen (web Angular `:4200`, Ionic `:8100`, Capacitor `capacitor://localhost`, `https://localhost`, túneles dev).
- Failover frontend: si el backend principal cae, prueba `BACKENDS` en orden (arranque + reintento en GET ante fallo de red/5xx).
- Config runtime editable sin recompilar vía `config.json`.

## Estructura del proyecto

```text
EcoReto_Campus/
├── README.md
├── backend/                    # API NestJS
│   ├── src/
│   │   ├── main.ts             # bootstrap, prefijo /gg, /uploads, CORS
│   │   ├── app.module.ts       # ConfigModule, TypeORM, módulos
│   │   ├── config/             # env.validation, database/jwt/cors/uploads/correo
│   │   ├── common/             # filtros, pipes, decoradores, helpers
│   │   ├── modules/
│   │   │   ├── auth/           # login, registro, refresh, guards JWT/roles
│   │   │   ├── usuarios/       # perfil, puntos, niveles
│   │   │   ├── retos/          # CRUD retos, categorías, estados
│   │   │   ├── participaciones/# evidencias, revisión
│   │   │   ├── premios/        # catálogo y canjes
│   │   │   ├── gustos/         # gustos ambientales
│   │   │   ├── soporte/        # tickets
│   │   │   ├── supervisor/     # revisión
│   │   │   └── admin/          # gestión total + historial
│   │   └── tasks/              # cron (@nestjs/schedule)
│   ├── test/                   # e2e
│   ├── .env.example            # plantilla (copiar a .env, no versionado)
│   └── uploads/                # archivos subidos (solo .gitkeep versionado)
├── frontend/                   # App Angular + Capacitor
│   ├── src/app/
│   │   ├── app.routes.ts       # rutas lazy + authGuard/invitadoGuard/roleGuard
│   │   ├── core/               # guards, interceptors, models, services (ConfigService, auth, API)
│   │   ├── shared/             # componentes reutilizables
│   │   ├── layout/             # MainLayout (header + sidebar)
│   │   └── views/              # auth, inicio, retos, premios, clasificacion,
│   │                           # perfil, soporte, supervisor, admin
│   ├── scripts/load-env.mjs    # genera environment.ts + public/config.json desde .env
│   ├── public/config.json      # config runtime (generado, no versionado)
│   ├── capacitor.config.ts     # appId com.ecoreto.campus
│   ├── android/                # proyecto nativo (build ignorado)
│   └── .env.example            # BACKEND_HOST/PORT/BACKENDS/API_PREFIX/UPLOADS_PREFIX
├── database/
│   └── ScriptEcoRetoBD.sql     # DDL completo (ENUMs + tablas)
├── docs/                       # (vacío) poner aquí capturas en docs/capturas/
└── tests/                      # (vacío) tests globales / manuales
```
