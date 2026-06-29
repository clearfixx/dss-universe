/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🛡️ Module: IAM Roles
 * 📄 File: index.ts
 *
 * 🎯 Purpose:
 * Public API for the IAM roles feature slice.
 *
 * 🧠 Responsibilities:
 * • exports RolesController;
 * • exports RolesService;
 * • exports role DTOs and types;
 * • keeps role feature imports explicit.
 *
 * 🏗️ Architecture:
 * Feature-slice public API boundary.
 *
 * ⚠️ Important:
 * Do not export internal helpers unless another slice truly needs them.
 *
 * 💡 Notes:
 * A clean index file is a clean docking port. 🛰️
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { RolesController } from './roles.controller';
export { RolesService } from './roles.service';

export { AssignRoleDto } from './dto/assign-role.dto';
export { CreateRoleDto } from './dto/create-role.dto';
export { UpdateRoleDto } from './dto/update-role.dto';

export type { RoleWithPermissions } from './types/role-with-permissions.type';
