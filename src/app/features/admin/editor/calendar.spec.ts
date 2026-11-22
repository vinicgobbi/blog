import {
  addDays,
  addMonths,
  displayDateTime,
  edgeOfWeek,
  formatDateTime,
  monthGrid,
  monthTitle,
  parseDateTime,
  relativeToNow,
} from './calendar';

describe('calendar', () => {
  it('parses and formats the datetime-local value', () => {
    expect(parseDateTime('2026-11-21T09:05')).toEqual({ day: '2026-11-21', hour: 9, minute: 5 });
    expect(parseDateTime('')).toBeNull();
    expect(parseDateTime('21/11/2026')).toBeNull();
    expect(formatDateTime({ day: '2026-11-21', hour: 9, minute: 5 })).toBe('2026-11-21T09:05');
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('adds months keeping the day within the target month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
  });

  it('finds the start (sunday) and end (saturday) of the week', () => {
    // 21/11/2026 é um sábado.
    expect(edgeOfWeek('2026-11-21', 'start')).toBe('2026-11-15');
    expect(edgeOfWeek('2026-11-21', 'end')).toBe('2026-11-21');
  });

  it('builds the weeks of the month starting on sunday', () => {
    const weeks = monthGrid('2026-11-10');

    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toEqual({ day: '2026-11-01', label: 1, inMonth: true });
    expect(weeks[4][1]).toEqual({ day: '2026-11-30', label: 30, inMonth: true });
    expect(weeks[4][2]).toEqual({ day: '2026-12-01', label: 1, inMonth: false });
  });

  it('includes days of the previous month in the first week', () => {
    // 01/12/2026 é uma terça.
    const firstWeek = monthGrid('2026-12-05')[0];

    expect(firstWeek.slice(0, 3).map((cell) => [cell.label, cell.inMonth])).toEqual([
      [29, false],
      [30, false],
      [1, true],
    ]);
  });

  it('writes month, date and relative time in portuguese', () => {
    expect(monthTitle('2026-11-21')).toBe('novembro de 2026');
    expect(displayDateTime({ day: '2026-11-21', hour: 9, minute: 30 })).toBe('21/11/2026 · 09:30');

    const now = new Date(2026, 10, 21, 9, 0);
    expect(relativeToNow({ day: '2026-11-24', hour: 9, minute: 0 }, now)).toBe('em 3 dias');
    expect(relativeToNow({ day: '2026-11-21', hour: 7, minute: 0 }, now)).toBe('há 2 horas');
    expect(relativeToNow({ day: '2026-11-21', hour: 9, minute: 20 }, now)).toBe('em 20 minutos');
    expect(relativeToNow({ day: '2026-11-21', hour: 9, minute: 0 }, now)).toBe('agora');
  });
});
