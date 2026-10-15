# NestJS + Redis Cache

API de ejemplo en español para practicar autenticación JWT y el patrón cache-aside con Redis. PostgreSQL es la fuente de verdad y Redis solo almacena respuestas públicas de productos durante un TTL.

## Requisitos

- Node.js 20 o posterior y npm.
- Docker Desktop con Docker Compose.
- La imagen `postgres:15.3` disponible en Docker Desktop; Compose la usa sin montar volúmenes.
- El puerto `5433` del host debe estar libre. Se usa porque PostgreSQL local en Windows suele ocupar `5432`; el contenedor sigue escuchando internamente en `5432`.

## Inicio local

1. Copia `.env.example` como `.env` y cambia `JWT_SECRET` por una clave aleatoria de al menos 32 caracteres.
2. Inicia PostgreSQL y Redis:

   ```sh
   docker compose up -d
   ```

3. Instala paquetes, genera Prisma Client, aplica la migración y carga productos de ejemplo:

   ```sh
   npm install
   npx prisma generate
   npm run prisma:deploy
   npm run prisma:seed
   ```

4. Inicia la API:

   ```sh
   npm run start:dev
   ```

La API escucha en `http://localhost:3000`. La documentación interactiva está en `http://localhost:3000/docs` y el documento OpenAPI en `http://localhost:3000/docs-json`.

> PostgreSQL no tiene un volumen montado. Los datos viven en el contenedor y no deben considerarse persistentes si se elimina o recrea. La persistencia con volúmenes queda como mejora futura.

## Endpoints

Todas las rutas de la API usan el prefijo `/api`.

| Método  | Ruta                 | Acceso  | Descripción                                     |
| ------- | -------------------- | ------- | ----------------------------------------------- |
| `POST`  | `/api/auth/register` | Público | Registra usuario y devuelve un JWT.             |
| `POST`  | `/api/auth/login`    | Público | Inicia sesión.                                  |
| `GET`   | `/api/auth/me`       | JWT     | Devuelve la identidad autenticada.              |
| `GET`   | `/api/products/:id`  | Público | Lee un producto mediante cache-aside.           |
| `PATCH` | `/api/products/:id`  | JWT     | Actualiza PostgreSQL e invalida la clave Redis. |

Ejemplo de registro:

```sh
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","password":"una-frase-secreta-larga"}'
```

Ejemplo de lectura:

```sh
curl http://localhost:3000/api/products/product-teclado
```

La primera lectura debe registrar un `cache miss`, consultar PostgreSQL y guardar la respuesta con el TTL configurado. Una lectura posterior antes de la expiración debe registrar un `cache hit`.

Para probar rutas protegidas, copia `accessToken` de la respuesta de registro o login y usa `Authorization: Bearer <token>`. En Swagger, pulsa **Authorize** e introduce el token.

## Configuración

| Variable                    | Uso                                    | Valor local predeterminado                                                      |
| --------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| `PORT`                      | Puerto HTTP                            | `3000`                                                                          |
| `DATABASE_URL`              | Conexión PostgreSQL                    | `postgresql://nest:nest-local-password@localhost:5433/nest_redis?schema=public` |
| `POSTGRES_PORT`             | Puerto PostgreSQL publicado en el host | `5433` (evita el PostgreSQL local en Windows, que usa `5432`)                   |
| `REDIS_URL`                 | Conexión Redis                         | `redis://localhost:6379`                                                        |
| `JWT_SECRET`                | Secreto de firma JWT                   | Debe configurarse; mínimo 32 caracteres                                         |
| `PRODUCT_CACHE_TTL_SECONDS` | TTL de productos en caché              | `60`                                                                            |

## Pruebas y calidad

Con los servicios locales encendidos, crea la base de datos, aplica migraciones y ejecuta:

```sh
npm test
npm run test:e2e
npm run build
npm run lint
```

Las pruebas e2e usan la base de datos y Redis de Docker Compose. Para ejecutarlas, configura `.env`, aplica la migración y deja ambos servicios disponibles. La prueba e2e utiliza un TTL de un segundo.

## Fallos y límites

- Si Redis falla al leer o escribir, la lectura consulta PostgreSQL; si PostgreSQL falla, la petición falla.
- Una actualización confirmada en PostgreSQL no se revierte si Redis falla al invalidar. La clave anterior puede servirse hasta que expire.
- Una lectura concurrente puede volver a escribir un valor antiguo después de una invalidación. La implementación de ejemplo acepta esta ventana acotada por el TTL y no ofrece consistencia estricta bajo concurrencia.
- PostgreSQL es la fuente de verdad. Actualizar PostgreSQL e invalidar Redis no forman una transacción distribuida.
- No se cachean tokens, credenciales ni respuestas privadas.

## Solución de problemas

- **No conecta a PostgreSQL:** confirma que `docker compose ps` muestre el servicio saludable y que `DATABASE_URL` use el mismo usuario, contraseña, puerto y base configurados en `.env`.
- **Redis no responde:** confirma que el servicio esté saludable y que `REDIS_URL` apunte al puerto local correcto. La API puede iniciar y servir lecturas desde PostgreSQL sin Redis.
- **JWT inválido al iniciar:** configura `JWT_SECRET` con al menos 32 caracteres y reinicia la API.
- **Faltan tablas:** ejecuta `npm run prisma:deploy` después de iniciar PostgreSQL.
- **Datos de ejemplo ausentes:** ejecuta `npm run prisma:seed` para cargar o volver a cargar el catálogo.
