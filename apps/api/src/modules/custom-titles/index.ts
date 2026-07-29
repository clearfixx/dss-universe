/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/index.ts
 *
 * 🎯 Purpose:
 * Exposes the supported Custom Titles module boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { CustomTitlesService } from './application/services/custom-titles.service';
export { CustomTitlesModule } from './custom-titles.module';
export type {
  CustomTitle,
  CustomTitleSettings,
  UserTitleGrant,
} from './domain/types/custom-titles.type';

/**
 * Import the boundary, not its persistence details.
 */
