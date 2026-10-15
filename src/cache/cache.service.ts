import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, RedisClientType } from "redis";

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: RedisClientType;

  constructor(configService: ConfigService) {
    this.client = createClient({
      url: configService.getOrThrow<string>("REDIS_URL"),
      socket: {
        reconnectStrategy: (retries) => (retries >= 2 ? false : 100),
      },
    });
    this.client.on("error", (error: Error) => {
      this.logger.warn(`Redis reportó un error: ${error.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureConnected();
    } catch (error) {
      this.logger.warn(`Redis no está disponible al iniciar: ${this.errorMessage(error)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    await this.ensureConnected();
    const value = await this.client.get(key);
    return value === null ? null : (JSON.parse(value) as T);
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.ensureConnected();
    await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  }

  async delete(key: string): Promise<void> {
    await this.ensureConnected();
    await this.client.del(key);
  }

  private async ensureConnected(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "error desconocido";
  }
}