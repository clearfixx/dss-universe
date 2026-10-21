/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/types/user-record.type.ts
 *
 * 🎯 Purpose:
 * Defines only the safe composed profile record, never a whole physical identity row.
 *
 * 🧠 Responsibilities:
 * • retains the existing sixteen display fields and no credential/account internals.
 *
 * 🏗️ Architecture:
 * Internal Users record alias; root assembles Auth display facts without exposing persistence representation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ViewerProfile } from '../../contracts/viewer-profile.contract';
export type UserRecord = ViewerProfile;
