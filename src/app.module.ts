import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import * as Joi from "joi";
import { AuthModule } from "./auth/auth.module";
import { CacheModule } from "./cache/cache.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductsModule } from "./products/products.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
        PORT: Joi.number().port().default(3000),
        DATABASE_URL: Joi.string().uri({ scheme: ["postgresql", "postgres"] }).required(),
        REDIS_URL: Joi.string().uri({ scheme: ["redis", "rediss"] }).required(),
        JWT_SECRET: Joi.string().min(32).required(),
        PRODUCT_CACHE_TTL_SECONDS: Joi.number().integer().min(1).default(60),
      }),
    }),
    PrismaModule,
    CacheModule,
    AuthModule,
    ProductsModule,
  ],
})
export class AppModule {}