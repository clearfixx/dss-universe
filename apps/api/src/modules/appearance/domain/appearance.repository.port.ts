import type { AppearanceSettings, ShellVariant } from './appearance.types';

export const APPEARANCE_REPOSITORY = Symbol('APPEARANCE_REPOSITORY');

export interface AppearanceRepositoryPort {
  get(): Promise<AppearanceSettings>;
  update(actorId: string, variant: ShellVariant): Promise<AppearanceSettings>;
}
