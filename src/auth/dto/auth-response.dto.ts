import { ApiProperty } from "@nestjs/swagger";

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: "Bearer" })
  tokenType!: string;

  @ApiProperty({ example: "cuid-user-id" })
  userId!: string;

  @ApiProperty({ example: "ana@example.com" })
  email!: string;
}

export class CurrentUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: "ana@example.com" })
  email!: string;
}