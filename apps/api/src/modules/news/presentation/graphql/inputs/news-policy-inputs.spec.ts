/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News Presentation
 * 📄 File: apps/api/src/modules/news/presentation/graphql/inputs/news-policy-inputs.spec.ts
 * 🎯 Purpose: Preserves validation of extracted settings and pin commands.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { validateSync } from 'class-validator';
import { NewsPaginationModeModel } from '../models/news-pagination-mode.model';
import { NewsPinScopeModel } from '../models/news-pin-scope.model';
import { SetNewsPinInput } from './set-news-pin.input';
import { UpdateNewsSettingsInput } from './update-news-settings.input';

describe('News policy transport inputs', () => {
  const settings = {
    newsPaginationMode: NewsPaginationModeModel.BOTH,
    newsPaginationThreshold: 12,
    newsPageSize: 12,
    commentsPaginationMode: NewsPaginationModeModel.PAGES,
    commentsPaginationThreshold: 20,
    commentsPageSize: 20,
  };

  it.each(Object.values(NewsPaginationModeModel))(
    'accepts pagination mode %s',
    (mode) => {
      expect(
        validateSync(
          Object.assign(new UpdateNewsSettingsInput(), settings, {
            newsPaginationMode: mode,
            commentsPaginationMode: mode,
          }),
        ),
      ).toEqual([]);
    },
  );

  it.each([
    'newsPaginationThreshold',
    'commentsPaginationThreshold',
    'newsPageSize',
    'commentsPageSize',
  ] as const)('preserves the integer range for %s', (field) => {
    const maximum = field.endsWith('Threshold') ? 500 : 100;
    for (const value of [1, maximum]) {
      expect(
        validateSync(
          Object.assign(new UpdateNewsSettingsInput(), settings, {
            [field]: value,
          }),
        ),
      ).toEqual([]);
    }
    for (const value of [0, maximum + 1, 1.5, '1']) {
      expect(
        validateSync(
          Object.assign(new UpdateNewsSettingsInput(), settings, {
            [field]: value,
          }),
        ),
      ).not.toEqual([]);
    }
  });

  it('rejects unknown pagination modes for either collection', () => {
    for (const field of ['newsPaginationMode', 'commentsPaginationMode']) {
      expect(
        validateSync(
          Object.assign(new UpdateNewsSettingsInput(), settings, {
            [field]: 'UNKNOWN',
          }),
        ),
      ).not.toEqual([]);
    }
  });

  const articleId = '123e4567-e89b-42d3-a456-426614174000';
  it.each(Object.values(NewsPinScopeModel))(
    'accepts the existing pin scope %s',
    (scope) => {
      expect(
        validateSync(
          Object.assign(new SetNewsPinInput(), { articleId, scope }),
        ),
      ).toEqual([]);
    },
  );

  it('retains optional category UUID validation without adding business rules', () => {
    for (const categoryId of [undefined, null, articleId]) {
      expect(
        validateSync(
          Object.assign(new SetNewsPinInput(), {
            articleId,
            scope: NewsPinScopeModel.CATEGORY,
            categoryId,
          }),
        ),
      ).toEqual([]);
    }
    expect(
      validateSync(
        Object.assign(new SetNewsPinInput(), {
          articleId,
          scope: NewsPinScopeModel.CATEGORY,
          categoryId: 'invalid',
        }),
      ),
    ).not.toEqual([]);
  });

  it('rejects invalid article identifiers and unknown scopes', () => {
    for (const fields of [
      { articleId: 'invalid', scope: NewsPinScopeModel.GLOBAL },
      { articleId, scope: 'UNKNOWN' },
    ]) {
      expect(
        validateSync(Object.assign(new SetNewsPinInput(), fields)),
      ).not.toEqual([]);
    }
  });
});
