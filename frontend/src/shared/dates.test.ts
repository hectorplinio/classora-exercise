import { formatDate, today } from './dates.ts';

test('a calendar date is shown day first, without time zone shifts', () => {
  expect(formatDate('2026-01-01')).toBe('01/01/2026');
});

test("today is the user's calendar date", () => {
  expect(today(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
});
