/**
 * 📄 File: apps/api/src/modules/users/domain/dto/update-user.dto.ts
 *
 * 🛠️ Update User DTO
 *
 * Internal domain-level input for updating a user.
 * All fields are optional because profile edits are usually partial.
 */

export interface UpdateUserContract {
  email?: string;
  username?: string;
  displayName?: string;
  passwordHash?: string;
  isActive?: boolean;
}
