import { fromDateTimeLocal, toDateTimeLocal } from './datetime-local';

describe('datetime-local conversions', () => {
  it('round-trips a date through the input format', () => {
    const iso = '2026-11-21T12:30:00.000Z';

    expect(fromDateTimeLocal(toDateTimeLocal(iso))).toBe(iso);
  });

  it('formats an API date with offset as local time without seconds', () => {
    const local = toDateTimeLocal('2026-11-21T09:30:45-03:00');

    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(new Date(local).getTime()).toBe(new Date('2026-11-21T09:30:00-03:00').getTime());
  });

  it('treats empty or invalid values as no date', () => {
    expect(toDateTimeLocal(null)).toBe('');
    expect(toDateTimeLocal('não é data')).toBe('');
    expect(fromDateTimeLocal('')).toBeNull();
    expect(fromDateTimeLocal('2026-99-99T99:99')).toBeNull();
  });
});
