import { SafeUser } from '../../users/domain/types/safe-user.type';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: SafeUser;
  tokens: AuthTokens;
};
