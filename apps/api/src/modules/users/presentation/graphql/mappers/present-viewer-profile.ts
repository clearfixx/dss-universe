/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/presentation/graphql/mappers/present-viewer-profile.ts
 *
 * 🎯 Purpose:
 * Publishes the named viewer projection without exporting a broad internal mapper.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ViewerProfile } from '../../../contracts/viewer-profile.contract';
import type { ViewerModel } from '../models/viewer.model';
import { UserGraphqlMapper } from './user-graphql.mapper';

export function presentViewerProfile(profile: ViewerProfile): ViewerModel {
  return UserGraphqlMapper.viewerFromSafeUser(profile);
}
