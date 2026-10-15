import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { CacheService } from "../src/cache/cache.service";
import { PrismaService } from "../src/prisma/prisma.service";

describe("API integration (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cache: CacheService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    cache = app.get(CacheService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("autentica, cachea una lectura pública, protege y actualiza el producto, y respeta el TTL", async () => {
    const suffix = randomUUID();
    const email = `integration-${suffix}@example.com`;
    const password = "una-frase-secreta-larga";
    const registration = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email, password })
      .expect(201);
    const token = registration.body.accessToken as string;

    await request(app.getHttpServer()).get("/api/auth/me").expect(401);
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password: "contraseña-incorrecta" })
      .expect(401);
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => expect(body.email).toBe(email));

    const productId = `integration-${suffix}`;
    await prisma.product.create({
      data: {
        id: productId,
        name: "Producto inicial",
        description: "Producto de integración",
        priceCents: 1000,
      },
    });
    await cache.delete(`product:${productId}`);

    await request(app.getHttpServer())
      .patch(`/api/products/${productId}`)
      .send({ name: "No autorizado" })
      .expect(401);

    const firstRead = await request(app.getHttpServer())
      .get(`/api/products/${productId}`)
      .expect(200);
    expect(firstRead.body.name).toBe("Producto inicial");

    await prisma.product.update({ where: { id: productId }, data: { name: "Cambio directo" } });
    const cachedRead = await request(app.getHttpServer())
      .get(`/api/products/${productId}`)
      .expect(200);
    expect(cachedRead.body.name).toBe("Producto inicial");

    const updatedRead = await request(app.getHttpServer())
      .patch(`/api/products/${productId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Actualizado por API" })
      .expect(200);
    expect(updatedRead.body.name).toBe("Actualizado por API");
    await request(app.getHttpServer())
      .get(`/api/products/${productId}`)
      .expect(200)
      .expect(({ body }) => expect(body.name).toBe("Actualizado por API"));

    await new Promise((resolve) => setTimeout(resolve, 1100));
    await prisma.product.update({ where: { id: productId }, data: { name: "Cambio tras TTL" } });
    await request(app.getHttpServer())
      .get(`/api/products/${productId}`)
      .expect(200)
      .expect(({ body }) => expect(body.name).toBe("Cambio tras TTL"));

    await prisma.product.delete({ where: { id: productId } });
    await prisma.user.delete({ where: { email } });
  });
});