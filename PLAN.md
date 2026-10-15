# Plan del proyecto: NestJS + Redis Cache

## Objetivo

Crear un proyecto NestJS ejecutable y una guía práctica basada en la estrategia de caché de la infografía. El flujo que se enseñará es:

1. El cliente solicita un recurso.
2. La aplicación busca la respuesta en Redis.
3. En un *cache hit*, responde desde Redis. En un *cache miss*, consulta PostgreSQL y guarda el resultado en Redis con un TTL.
4. La aplicación devuelve la respuesta al cliente.

El proyecto también demostrará invalidación de caché, autenticación y los casos donde conviene evitar el cacheo.

## Reglas de idioma

- El código fuente usará inglés para nombres de variables, funciones, clases, métodos, módulos, rutas internas y otros identificadores.
- El README, las guías, la documentación y los comentarios del código estarán en español.
- Los nombres oficiales de tecnologías y términos técnicos como *cache hit*, *cache miss*, TTL, JWT, NestJS, Prisma, PostgreSQL y Redis conservarán su forma habitual.

## Stack y alcance base

- NestJS para la API.
- `@nestjs/swagger` para generar la especificación OpenAPI y servir documentación interactiva.
- PostgreSQL como base de datos y fuente de verdad.
- Imagen local de PostgreSQL: `postgres:15.3`.
- Prisma para el acceso a datos y las migraciones.
- Redis para la caché.
- Cliente oficial `redis` para Node.js, encapsulado detrás del adaptador de caché.
- JWT para autenticación.
- Docker Compose para ejecutar PostgreSQL y Redis localmente.
- API únicamente; sin interfaz web.
- Recurso de ejemplo: catálogo de productos.

## Fases de implementación

### 1. Estructura y entorno local

- Crear el proyecto NestJS y configurar TypeScript, validación y scripts habituales.
- Configurar Swagger con documentación interactiva en `/docs` y especificación OpenAPI en `/docs-json`.
- Documentar endpoints, DTOs, respuestas y códigos de estado; configurar autenticación Bearer JWT para probar las rutas protegidas desde Swagger.
- Añadir `docker-compose.yml` para PostgreSQL y Redis; configurar PostgreSQL con la imagen `postgres:15.3` disponible en Docker Desktop. Publicar el puerto del contenedor `5432` en el puerto `5433` del host para evitar conflictos con PostgreSQL instalado en Windows.
- No montar volúmenes para PostgreSQL en la versión inicial: los datos no tendrán persistencia fuera del ciclo de vida del contenedor y podrán perderse al eliminarlo o recrearlo.
- Añadir `.env.example` con configuración de base de datos, Redis, JWT y TTL, sin secretos reales.
- Documentar instalación, inicio de servicios, migraciones, carga de datos de ejemplo, ejecución y pruebas.

### 2. Persistencia y datos de ejemplo

- Definir modelos `User` y `Product` en Prisma.
- Crear migraciones y un proceso repetible para cargar productos de ejemplo.
- Guardar contraseñas únicamente como hashes; nunca persistir contraseñas en texto plano.

### 3. Autenticación JWT

- Implementar registro e inicio de sesión.
- Validar entradas y contraseñas; emitir un JWT firmado usando una clave de entorno.
- Añadir estrategia y guard JWT para proteger endpoints.
- Incluir una ruta protegida, por ejemplo `GET /auth/me`, para verificar la identidad autenticada.
- Exigir JWT para las mutaciones de productos; mantener públicas las lecturas del catálogo de ejemplo.
- No cachear tokens, credenciales ni respuestas privadas o personalizadas en claves compartidas.

### 4. Redis y estrategia cache-aside

- Implementar un adaptador pequeño de Redis que encapsule conexión, lectura, escritura con expiración y borrado.
- Implementar `GET /products/:id` con el flujo explícito:
  - Buscar la clave del producto en Redis.
  - Si existe, registrar el hit y devolver el valor.
  - Si no existe, registrar el miss, consultar PostgreSQL, guardar el resultado con TTL y devolverlo.
  - Si Redis falla al leer o escribir, continuar usando PostgreSQL cuando sea posible.
- Usar claves con un formato predecible, por ejemplo `product:{id}`.
- Mantener visibles los hit, miss y fallos de caché mediante logs claros, sin exponer datos sensibles.

### 5. Actualización e invalidación

- Implementar lectura y actualización de productos.
- Persistir una actualización en PostgreSQL antes de invalidar la clave Redis correspondiente.
- Si Redis no está disponible durante la invalidación, no deshacer una actualización ya confirmada en PostgreSQL; registrar el fallo y explicar que la caché puede quedar obsoleta hasta que expire el TTL.
- La invalidación no elimina todas las carreras: una lectura concurrente puede obtener el valor anterior de PostgreSQL y volver a escribirlo en Redis después del borrado. La versión inicial acepta esta ventana acotada por el TTL; no promete consistencia estricta bajo concurrencia.
- Mantener PostgreSQL como fuente de verdad. La escritura en PostgreSQL y el borrado en Redis no forman una transacción distribuida.

### 6. Criterios para decidir qué cachear

La guía debe advertir sobre el cacheo de:

- Información muy dinámica, como cotizaciones que cambian continuamente.
- Datos donde cada milisegundo sea crítico y la antigüedad de la respuesta no sea aceptable.
- Datos altamente personalizados o privados, salvo que se diseñen claves aisladas y una política de autorización adecuada.
- Datos de alta cardinalidad o que consuman demasiada memoria para el beneficio obtenido.
- Credenciales, tokens y secretos.

La versión inicial cacheará solamente respuestas públicas del catálogo de productos.

### 7. Pruebas

- Usar pruebas de integración contra PostgreSQL y Redis iniciados con Docker Compose para validar los flujos principales; aislar lógica puntual con dobles cuando no se necesiten los servicios reales.
- Autenticación: registro, login correcto e incorrecto, y rechazo de solicitudes sin JWT en una ruta protegida.
- Productos: rechazar una mutación sin JWT y permitirla con JWT válido.
- Caché hit: devolver el producto desde Redis sin consultar PostgreSQL.
- Caché miss: consultar PostgreSQL y guardar la respuesta en Redis con TTL.
- Invalidación secuencial: después de actualizar un producto, una lectura posterior debe reflejar el valor de PostgreSQL. Documentar aparte la ventana de obsolescencia posible bajo concurrencia.
- Expiración: demostrar con un TTL corto de prueba que una clave expira y la lectura posterior vuelve a consultar PostgreSQL.
- Redis no disponible con PostgreSQL disponible: verificar que las lecturas recurran a PostgreSQL y que las mutaciones ya confirmadas no fallen solo por un error de invalidación. Si PostgreSQL tampoco está disponible, la petición debe fallar.

### 8. Documentación

- Crear `README.md` en español como tutorial paso a paso, incluyendo requisitos, comandos, variables de entorno, acceso a Swagger, diagrama del flujo, ejemplos de solicitudes y respuestas, observaciones esperadas, pruebas y solución de problemas comunes.
- Crear `docs/mejoras-posibles.md` en español para describir opciones futuras que no forman parte de la implementación base:
  - Alta disponibilidad: Redis Sentinel o Redis Cluster, réplicas, failover, persistencia y consideraciones operativas.
  - Persistencia de PostgreSQL mediante un volumen nombrado de Docker, incluyendo el ciclo de vida de los datos y la necesidad de copias de seguridad para entornos importantes.
  - Bloqueos distribuidos: casos de uso, expiración, liberación segura, riesgos de deadlock y alternativas; no introducirlos sin demostrar que resuelven una contención real.
  - Benchmarking amplio: herramientas y escenarios para comparar sin caché/con caché, latencia, throughput, tasa de hit, consumo de memoria y comportamiento con carga; incluir límites y reproducibilidad.

## Estructura de archivos prevista

```text
.
├── PLAN.md
├── README.md
├── docker-compose.yml
├── .env.example
├── package.json
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── auth/
│   ├── cache/
│   ├── products/
│   ├── prisma/
│   ├── app.module.ts
│   └── main.ts
├── test/
└── docs/
    └── mejoras-posibles.md
```

Los nombres concretos de archivos pueden ajustarse a las convenciones que genere la versión de NestJS utilizada, sin cambiar las responsabilidades descritas.

## Criterios de aceptación

- Un usuario puede registrarse, iniciar sesión y acceder a una ruta protegida con JWT.
- Una primera lectura de producto produce un miss, consulta PostgreSQL y almacena la respuesta en Redis.
- Una segunda lectura antes de expirar el TTL produce un hit.
- Una actualización secuencial invalida la clave y la lectura siguiente refleja el valor de PostgreSQL; se documenta que una carrera concurrente puede dejar un valor obsoleto hasta que expire el TTL.
- Las mutaciones de productos requieren JWT; las lecturas públicas del catálogo no.
- Swagger está disponible en `/docs`, genera la especificación OpenAPI en `/docs-json` y permite explorar las rutas protegidas mediante Bearer JWT.
- Docker Compose usa la imagen `postgres:15.3`, publica PostgreSQL en el puerto `5433` del host para evitar el `5432` ocupado en Windows y no monta un volumen de datos en la versión inicial.
- La expiración y el comportamiento ante la caída de Redis están probados y documentados.
- README, comentarios y documentos están en español; los identificadores del código están en inglés.
- `docs/mejoras-posibles.md` cubre alta disponibilidad, bloqueos distribuidos y benchmarking amplio como trabajo futuro, no como características ya implementadas.
- Las pruebas y los comandos disponibles de compilación, typecheck y lint pasan.

## Fuera del alcance inicial

- Alta disponibilidad y operación de Redis en producción.
- Persistencia de PostgreSQL mediante volúmenes Docker; se documentará como mejora futura.
- Bloqueos distribuidos.
- Benchmarking amplio o afirmaciones de rendimiento sin mediciones reproducibles.
- Interfaz web, autorización basada en roles y despliegue en la nube.

Estos puntos podrán planificarse después de completar la implementación base y se documentarán como mejoras posibles cuando corresponda.
