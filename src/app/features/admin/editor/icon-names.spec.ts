import { MAX_ICON_RESULTS, SUGGESTED_ICONS, filterIcons, loadIconNames } from './icon-names';

describe('filterIcons', () => {
  const names = ['person', 'person-circle', 'arrow-left', 'arrow-left-circle', 'envelope'];

  it('returns the suggestions when there is no query', () => {
    expect(filterIcons(names, '')).toBe(SUGGESTED_ICONS);
    expect(filterIcons(names, '   ')).toBe(SUGGESTED_ICONS);
  });

  it('matches every term, ignoring case and hyphens', () => {
    expect(filterIcons(names, 'Person')).toEqual(['person', 'person-circle']);
    expect(filterIcons(names, 'left circle')).toEqual(['arrow-left-circle']);
    expect(filterIcons(names, 'arrow-left')).toEqual(['arrow-left', 'arrow-left-circle']);
    expect(filterIcons(names, 'nada')).toEqual([]);
  });

  it('limits the number of results', () => {
    const many = Array.from({ length: MAX_ICON_RESULTS + 10 }, (_, index) => `icon-${index}`);

    expect(filterIcons(many, 'icon')).toHaveLength(MAX_ICON_RESULTS);
  });
});

describe('loadIconNames', () => {
  it('loads the Bootstrap Icons names, including every suggestion', async () => {
    const names = await loadIconNames();

    expect(names.length).toBeGreaterThan(1000);
    expect(names).toEqual(expect.arrayContaining(SUGGESTED_ICONS));
    expect(names.every((name) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name))).toBe(true);
  });
});
