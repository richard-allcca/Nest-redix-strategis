# Mejoras posibles

Estas opciones no forman parte de la implementación inicial.

## Persistencia PostgreSQL

La configuración local inicial no monta volúmenes y, por tanto, no conserva los datos si el contenedor se elimina o recrea. Una mejora es declarar un volumen nombrado de Docker para `/var/lib/postgresql/data`. Antes de usar esta opción para datos importantes, definir copias de seguridad, restauración, retención y migración de datos; un volumen no sustituye a un backup.

## Alta disponibilidad de Redis

Evaluar Redis Sentinel o Redis Cluster, réplicas, failover, persistencia y procedimientos operativos según los requisitos reales de disponibilidad. Redis es una caché reconstruible en este ejemplo, no la fuente de verdad.

## Bloqueos distribuidos

Investigar casos concretos de contención antes de introducir bloqueos. Si fueran necesarios, documentar expiración, liberación segura, fencing cuando aplique, riesgos de deadlock y alternativas. No agregarlos sin demostrar que resuelven un problema medido.

## Consistencia de caché bajo concurrencia

La invalidación simple puede competir con una lectura que vuelve a poblar una clave obsoleta. Si el producto requiere una garantía más estricta que la acotada por TTL, evaluar versionado de claves, escrituras coordinadas o un patrón outbox, junto con sus costes y pruebas de carrera.

## Benchmarking

Comparar sin caché y con caché bajo escenarios reproducibles, midiendo latencia, throughput, tasa de hit, consumo de memoria y comportamiento con carga. Documentar herramientas, límites, datos, configuración y condiciones para evitar afirmaciones de rendimiento no verificables.
