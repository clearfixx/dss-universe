/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles Tests
 * 📄 File: apps/api/src/modules/custom-titles/application/services/custom-titles.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies validation, lifecycle conflicts, cooldowns, and self-selection.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { CustomTitlesRepository } from '../../domain/repositories/custom-titles.repository.interface';
import type {
  CustomTitle,
  UserTitleGrant,
} from '../../domain/types/custom-titles.type';
import { CustomTitlesService } from './custom-titles.service';

const title: CustomTitle = {
  id: 'title-1',
  name: 'User of the Year',
  slug: 'user-of-the-year',
  description: 'Annual community award.',
  color: '#7C3AED',
  badge: 'crown',
  isActive: true,
  createdById: 'admin-1',
  updatedById: 'admin-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const grant: UserTitleGrant = {
  id: 'grant-1',
  userId: 'user-1',
  titleId: title.id,
  grantedById: 'admin-1',
  grantReason: 'Outstanding contribution.',
  grantedAt: new Date(),
  revokedAt: null,
  revokedById: null,
  revokeReason: null,
  title,
  selected: false,
};

describe('CustomTitlesService', () => {
  const repository = {
    definitions: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    grants: jest.fn(),
    grant: jest.fn(),
    revoke: jest.fn(),
    select: jest.fn(),
    settings: jest.fn(),
    updateSettings: jest.fn(),
  } as unknown as jest.Mocked<CustomTitlesRepository>;
  const service = new CustomTitlesService(repository);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.create.mockResolvedValue({ status: 'OK', value: title });
    repository.update.mockResolvedValue({ status: 'OK', value: title });
    repository.grant.mockResolvedValue({ status: 'OK', grant });
    repository.revoke.mockResolvedValue({
      status: 'OK',
      grant: { ...grant, revokedAt: new Date() },
    });
    repository.select.mockResolvedValue({
      status: 'OK',
      grant: { ...grant, selected: true },
      retryAt: null,
    });
  });

  it('normalizes presentation metadata and creates a stable slug', async () => {
    await service.create(
      {
        name: '  User of the Year  ',
        description: ' Annual community award. ',
        color: '#7c3aed',
        badge: ' crown ',
      },
      'admin-1',
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.create).toHaveBeenCalledWith({
      name: 'User of the Year',
      slug: 'user-of-the-year',
      description: 'Annual community award.',
      color: '#7C3AED',
      badge: 'crown',
      actorId: 'admin-1',
    });
  });

  it('rejects invalid colors before persistence', async () => {
    await expect(
      service.create(
        { name: 'Best Author', color: 'purple', badge: 'pen' },
        'admin-1',
      ),
    ).rejects.toMatchObject({ status: 400 });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('keeps Ukrainian title names suitable for stable slugs', async () => {
    await service.create(
      {
        name: 'Кращий автор',
        color: '#0EA5E9',
        badge: 'pen-tool',
      },
      'admin-1',
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'кращий-автор' }),
    );
  });

  it('maps duplicate definitions to conflict', async () => {
    repository.create.mockResolvedValue({ status: 'CONFLICT', value: null });

    await expect(
      service.create(
        { name: 'Best Author', color: '#123456', badge: 'pen' },
        'admin-1',
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('requires a meaningful grant reason', async () => {
    await expect(
      service.grant('user-1', 'title-1', 'no', 'admin-1'),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('prevents duplicate active grants', async () => {
    repository.grant.mockResolvedValue({ status: 'CONFLICT', grant: null });

    await expect(
      service.grant(
        'user-1',
        'title-1',
        'Outstanding contribution.',
        'admin-1',
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('reports selection cooldown with its retry time', async () => {
    const retryAt = new Date(Date.now() + 86_400_000);
    repository.select.mockResolvedValue({
      status: 'COOLDOWN',
      grant: null,
      retryAt,
    });

    await expect(service.select('user-1', 'grant-2')).rejects.toThrow(
      retryAt.toISOString(),
    );
  });

  it('accepts zero-day cooldown as an explicit policy', async () => {
    repository.updateSettings.mockResolvedValue({
      selectionCooldownDays: 0,
      updatedById: 'admin-1',
      updatedAt: new Date(),
    });

    await service.updateSettings(0, 'admin-1');

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.updateSettings).toHaveBeenCalledWith(0, 'admin-1');
  });
});

/**
 * If a badge starts authorizing requests, this suite calls Security Deck.
 */
