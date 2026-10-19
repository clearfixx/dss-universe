/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/index.ts
 *
 * 🎯 Purpose:
 * Exposes named title contracts and assembly without its private application service.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { CustomTitlesModule } from './custom-titles.module';
export {
  TITLE_GRANT_TRANSACTION,
  type TitleGrantTransaction,
  type GrantCustomTitle,
} from './contracts/title-grant-transaction.port';
export type {
  CustomTitle,
  CustomTitleSettings,
  UserTitleGrant,
} from './domain/types/custom-titles.type';

/**
 * Import the boundary, not its persistence details.
 */
