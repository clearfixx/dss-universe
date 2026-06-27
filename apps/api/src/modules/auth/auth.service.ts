import { Inject, Injectable } from '@nestjs/common';
import { USERS_REPOSITORY } from '../users/interfaces/users.repository.interface';
import type { UsersRepository } from '../users/interfaces/users.repository.interface';
import { UserMapper } from '../users/mappers/user.mapper';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailAlreadyExistsException } from './exceptions/email-already-exists.exception';
import { InvalidCredentialsException } from './exceptions/invalid-credentials.exception';
import { PasswordHashService } from './services/password-hash.service';
import { TokenService } from './services/token.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from '@api/core/auth/types/jwt-payload.type';
@Injectable()
export class AuthService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
    private readonly passwordHashService: PasswordHashService,
    private readonly tokenService: TokenService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new EmailAlreadyExistsException();
    }

    const passwordHash = await this.passwordHashService.hash(dto.password);

    const user = await this.usersRepository.create({
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName,

      // У базу ніколи не пишемо сирий пароль — тільки хеш.
      passwordHash,
    });

    return this.issueAuthResponse(user.id);
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmail(dto.email);

    if (!user) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await this.passwordHashService.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    return this.issueAuthResponse(user.id);
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        dto.refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      throw new InvalidCredentialsException();
    }

    const user = await this.usersRepository.findById(payload.sub);

    if (!user || !user.refreshTokenHash) {
      throw new InvalidCredentialsException();
    }

    const isRefreshTokenValid = await this.passwordHashService.compare(
      dto.refreshToken,
      user.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new InvalidCredentialsException();
    }

    return this.issueAuthResponse(user.id);
  }

  async logout(userId: string) {
    await this.usersRepository.updateRefreshTokenHash(userId, null);

    return { success: true };
  }

  private async issueAuthResponse(userId: string) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new InvalidCredentialsException();
    }

    const tokens = await this.tokenService.generateTokens(user);
    const refreshTokenHash = await this.passwordHashService.hash(
      tokens.refreshToken,
    );

    await this.usersRepository.updateRefreshTokenHash(
      user.id,
      refreshTokenHash,
    );

    return {
      user: UserMapper.toSafeUser(user),
      tokens,
    };
  }
}

