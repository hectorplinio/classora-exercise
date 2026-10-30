import { formatDate } from './dates.ts';

test('a calendar date is shown day first, without time zone shifts', () => {
  expect(formatDate('2026-01-01')).toBe('01/01/2026');
});
