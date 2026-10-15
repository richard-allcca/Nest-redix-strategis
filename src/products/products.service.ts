import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Product } from "@prisma/client";
import { CacheService } from "../cache/cache.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProductResponseDto } from "./dto/product-response.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly configService: ConfigService,
  ) {}

  async findOne(id: string): Promise<ProductResponseDto> {
    const cacheKey = this.cacheKey(id);
    try {
      const cached = await this.cache.get<ProductResponseDto>(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit para ${cacheKey}`);
        return cached;
      }
    } catch (error) {
      this.logger.warn(`Fallo de caché al leer ${cacheKey}; se consultará PostgreSQL: ${this.errorMessage(error)}`);
    }

    this.logger.log(`Cache miss para ${cacheKey}`);
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException("No se encontró el producto.");
    }

    const response = this.toResponse(product);
    try {
      await this.cache.set(
        cacheKey,
        response,
        this.configService.get<number>("PRODUCT_CACHE_TTL_SECONDS", 60),
      );
    } catch (error) {
      this.logger.warn(`Fallo de caché al guardar ${cacheKey}: ${this.errorMessage(error)}`);
    }
    return response;
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException("Debe proporcionar al menos un campo para actualizar.");
    }

    let product: Product;
    try {
      product = await this.prisma.product.update({ where: { id }, data: dto });
    } catch (error) {
      if (this.isRecordNotFoundError(error)) {
        throw new NotFoundException("No se encontró el producto.");
      }
      throw error;
    }

    const cacheKey = this.cacheKey(id);
    try {
      await this.cache.delete(cacheKey);
    } catch (error) {
      this.logger.error(
        `El producto ${id} se actualizó en PostgreSQL, pero no se pudo invalidar ${cacheKey}; el valor anterior puede permanecer hasta el TTL: ${this.errorMessage(error)}`,
      );
    }
    return this.toResponse(product);
  }

  private toResponse(product: Product): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      priceCents: product.priceCents,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  private cacheKey(id: string): string {
    return `product:${id}`;
  }

  private isRecordNotFoundError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2025"
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "error desconocido";
  }
}