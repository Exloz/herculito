import { describe, expect, it } from 'vitest';
import bootstrap from '../../../public/theme-init.js?raw';
import { DEFAULT_THEME, THEMES } from './themes';

function boot(saved: string | null, blocked = false) {
  const context = {
    document: { documentElement: { dataset: { theme: '' } } },
    localStorage: { getItem: () => {
      if (blocked) throw new Error('Storage unavailable');
      return saved;
    } }
  };
  new Function('document', 'localStorage', bootstrap)(context.document, context.localStorage);
  return context.document.documentElement.dataset.theme;
}

describe('theme bootstrap before React loads', () => {
  it.each(THEMES)('restores $label before the first paint', ({ id }) => {
    expect(boot(id)).toBe(id);
  });

  it('falls back safely for missing, obsolete or unavailable preferences', () => {
    expect(boot(null)).toBe(DEFAULT_THEME);
    expect(boot('obsolete-theme')).toBe(DEFAULT_THEME);
    expect(boot('light', true)).toBe(DEFAULT_THEME);
  });
});
