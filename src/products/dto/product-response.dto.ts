import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ProductResponseDto {
  @ApiProperty({ example: "product-teclado" })
  id!: string;

  @ApiProperty({ example: "Teclado mecánico" })
  name!: string;

  @ApiPropertyOptional({ example: "Diseño compacto con conexión USB-C." })
  description!: string | null;

  @ApiProperty({ example: 8999, description: "Precio expresado en centavos." })
  priceCents!: number;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}