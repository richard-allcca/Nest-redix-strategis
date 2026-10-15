import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ProductResponseDto } from "./dto/product-response.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductsService } from "./products.service";

@ApiTags("products")
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(":id")
  @ApiParam({ name: "id", example: "product-teclado" })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ description: "No se encontró el producto." })
  findOne(@Param("id") id: string): Promise<ProductResponseDto> {
    return this.productsService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: "id", example: "product-teclado" })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse({ description: "No se encontró el producto." })
  @ApiUnauthorizedResponse({ description: "Se requiere un JWT válido." })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, dto);
  }
}