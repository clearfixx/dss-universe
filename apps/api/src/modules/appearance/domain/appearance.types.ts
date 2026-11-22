export const SHELL_VARIANTS = {
  MODULE_LAUNCHER: 'MODULE_LAUNCHER',
  HORIZONTAL_NAVIGATION: 'HORIZONTAL_NAVIGATION',
  HYBRID: 'HYBRID',
} as const;

export type ShellVariant = (typeof SHELL_VARIANTS)[keyof typeof SHELL_VARIANTS];

export type AppearanceSettings = {
  id: string;
  activeShellVariant: ShellVariant;
  updatedById: string | null;
  updatedAt: Date;
};
