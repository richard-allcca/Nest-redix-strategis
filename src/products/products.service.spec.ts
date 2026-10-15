import { ConfigService } from "@nestjs/config";
import { CacheService } from "../cache/cache.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "./products.service";

describe("ProductsService", () => {
  let service: ProductsService;
  let prisma: { product: { findUnique: jest.Mock; update: jest.Mock } };
  let cache: { get: jest.Mock; set: jest.Mock; delete: jest.Mock };

  const product = {
    id: "product-test",
    name: "Producto de prueba",
    description: null,
    priceCents: 1234,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  beforeEach(() => {
    prisma = {
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    const config = { get: jest.fn().mockReturnValue(60) };
    service = new ProductsService(
      prisma as unknown as PrismaService,
      cache as unknown as CacheService,
      config as unknown as ConfigService,
    );
  });

  it("devuelve un cache hit sin consultar PostgreSQL", async () => {
    const cachedProduct = {
      ...product,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
    cache.get.mockResolvedValue(cachedProduct);

    await expect(service.findOne(product.id)).resolves.toEqual(cachedProduct);
    expect(prisma.product.findUnique).not.toHaveBeenCalled();
  });

  it("consulta PostgreSQL y cachea un miss con TTL", async () => {
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue(undefined);
    prisma.product.findUnique.mockResolvedValue(product);

    const result = await service.findOne(product.id);

    expect(result.name).toBe(product.name);
    expect(cache.set).toHaveBeenCalledWith(
      `product:${product.id}`,
      result,
      60,
    );
  });

  it("usa PostgreSQL cuando Redis falla al leer y escribir", async () => {
    cache.get.mockRejectedValue(new Error("Redis desconectado"));
    cache.set.mockRejectedValue(new Error("Redis desconectado"));
    prisma.product.findUnique.mockResolvedValue(product);

    await expect(service.findOne(product.id)).resolves.toMatchObject({ id: product.id });
    expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { id: product.id } });
  });

  it("conserva la actualización de PostgreSQL si falla la invalidación", async () => {
    prisma.product.update.mockResolvedValue({ ...product, name: "Nombre actualizado" });
    cache.delete.mockRejectedValue(new Error("Redis desconectado"));

    await expect(service.update(product.id, { name: "Nombre actualizado" })).resolves.toMatchObject({
      name: "Nombre actualizado",
    });
    expect(prisma.product.update).toHaveBeenCalled();
  });
});