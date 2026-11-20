/** DSS Universe — owner failure, without Nest/HTTP semantics. */
import type { QualifiedPointBlockCode } from '../types/qualified-points.type';

export class PointQualificationBlockedError extends Error {
  constructor(readonly code: QualifiedPointBlockCode) {
    super('Community Points requires verified qualification evidence.');
    this.name = 'PointQualificationBlockedError';
  }
}
