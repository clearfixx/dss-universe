/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/index.ts
 *
 * 🎯 Purpose:
 * Publishes module assembly and narrow owned asset, eligibility and public metadata contracts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { MediaModule } from './media.module';
export {
  MEDIA_PUBLIC_ATTACHMENT_READER,
  type MediaPublicAttachmentReader,
  type MediaPublicAttachment,
  type MediaPublicAttachmentQuery,
} from './contracts/public-attachment-reader.contract';
export {
  MEDIA_IMAGE_ELIGIBILITY,
  type MediaImageEligibility,
} from './contracts/media-image-eligibility.contract';
export {
  MEDIA_PROFILE_ASSET_COMMANDS,
  type MediaProfileAssetCommands,
} from './contracts/profile-asset-commands.contract';
export {
  PROFILE_ASSET_TRANSACTION,
  type ProfileAssetTransaction,
  type ProfileAssetAssignment,
  type ProfileAssetSlot,
} from './contracts/profile-asset-transaction.port';
export {
  MEDIA_PUBLICATION_EVIDENCE,
  type MediaPublicationEvidenceReader,
  type MediaPublicationEvidence,
} from './contracts/media-publication-evidence.contract';
