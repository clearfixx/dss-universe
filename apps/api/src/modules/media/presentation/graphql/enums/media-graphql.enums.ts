/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/presentation/graphql/enums/media-graphql.enums.ts
 *
 * 🎯 Purpose:
 * Registers Media domain enums as stable GraphQL schema contracts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { registerEnumType } from '@nestjs/graphql';

import { MediaKind } from '../../../domain/enums/media-kind.enum';
import { MediaStatus } from '../../../domain/enums/media-status.enum';
import { MediaVisibility } from '../../../domain/enums/media-visibility.enum';

registerEnumType(MediaKind, { name: 'MediaKind' });
registerEnumType(MediaStatus, { name: 'MediaStatus' });
registerEnumType(MediaVisibility, { name: 'MediaVisibility' });

export { MediaKind, MediaStatus, MediaVisibility };
