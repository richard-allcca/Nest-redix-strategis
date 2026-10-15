process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??=
  "postgresql://nest:nest-local-password@localhost:5433/nest_redis?schema=public";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "local-e2e-secret-that-is-at-least-32-characters";
process.env.PRODUCT_CACHE_TTL_SECONDS = "1";