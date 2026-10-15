import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { hash, compare } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    if (Buffer.byteLength(dto.password, "utf8") > 72) {
      throw new BadRequestException("La contraseña supera el máximo de 72 bytes.");
    }

    const passwordHash = await hash(dto.password, 12);
    let user: { id: string; email: string };
    try {
      user = await this.prisma.user.create({
        data: { email: dto.email, passwordHash },
        select: { id: true, email: true },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("Ya existe una cuenta con ese correo.");
      }
      throw error;
    }

    return this.createAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const validPassword = user ? await compare(dto.password, user.passwordHash) : false;
    if (!user || !validPassword) {
      throw new UnauthorizedException("Correo o contraseña incorrectos.");
    }

    return this.createAuthResponse(user);
  }

  private async createAuthResponse(user: { id: string; email: string }): Promise<AuthResponseDto> {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      { expiresIn: 3600 },
    );
    return { accessToken, tokenType: "Bearer", userId: user.id, email: user.email };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }
}