/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/controllers/users.controller.ts
 *
 * 🎯 Purpose:
 * Exposes HTTP endpoints for user-related operations.
 *
 * 🧠 Responsibilities:
 * • defines the Users HTTP route boundary;
 * • receives incoming user-related requests;
 * • delegates all business work to UsersService.
 *
 * 🏗️ Architecture:
 * Thin controller. No business logic.
 *
 * ⚠️ Important:
 * Do not move user business rules into this controller.
 *
 * 💡 Notes:
 * Controller is a dispatcher, not a council of elders.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Controller } from '@nestjs/common';

@Controller('users')
export class UsersController {}

/**
 * -----------------------------------------------------------------------------
 * 🎯 Controllers dispatch requests.
 * They do not make business decisions.
 * -----------------------------------------------------------------------------
 */
