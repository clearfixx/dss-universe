/**
 * 📄 File: apps/api/src/modules/users/domain/dto/create-user.dto.ts
 *
 * 🧱 Create User DTO
 *
 * Internal domain-level input for creating a user.
 * This is not a controller DTO and not a Prisma type.
 */

export interface CreateUserContract {
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
}
