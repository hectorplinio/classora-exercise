import {
  DEFAULT_PARAMS,
  parseTicketListParams,
  toSearchParams,
} from './ticketListParams.ts';

const parse = (search: string) => parseTicketListParams(new URLSearchParams(search));

test('an empty URL gives the defaults', () => {
  expect(parse('')).toEqual(DEFAULT_PARAMS);
});

test('a manipulated URL is normalized to valid values', () => {
  expect(parse('offset=-5&limit=9999&state=FOO&severity=&sort=NAME&direction=UP')).toEqual(
    DEFAULT_PARAMS,
  );
});

test.each(['offset=1.5', 'offset=1e3', 'offset=abc', 'offset=100001', 'limit=0', 'limit=101'])(
  'an invalid number (%s) falls back to its default',
  (search) => {
    expect(parse(search)).toEqual(DEFAULT_PARAMS);
  },
);

test('valid values are kept', () => {
  expect(
    parse(
      'offset=40&limit=50&q=log4j&state=DONE&state=REPORTED&severity=HIGH' +
        '&assignedTeam=Payments&expiredOnly=true&sort=KEY&direction=ASC',
    ),
  ).toEqual({
    offset: 40,
    limit: 50,
    q: 'log4j',
    state: ['REPORTED', 'DONE'],
    severity: ['HIGH'],
    assignedTeam: 'Payments',
    expiredOnly: true,
    sort: 'KEY',
    direction: 'ASC',
  });
});

test('invalid and repeated values are dropped from a multi-value filter', () => {
  expect(parse('state=FOO&state=DONE&state=DONE').state).toEqual(['DONE']);
});

test('texts are cut to the contract limits', () => {
  const params = parse(`q=${'a'.repeat(300)}&assignedTeam=${'b'.repeat(150)}`);

  expect(params.q).toHaveLength(256);
  expect(params.assignedTeam).toHaveLength(100);
});

test('the defaults are not written to the URL', () => {
  expect(toSearchParams(DEFAULT_PARAMS).toString()).toBe('');
});

test('only the values that differ from the defaults are written, in a stable order', () => {
  const search = toSearchParams({
    ...DEFAULT_PARAMS,
    offset: 20,
    state: ['DONE', 'REPORTED'],
    sort: 'KEY',
  });

  expect(search.toString()).toBe('state=REPORTED&state=DONE&sort=KEY&offset=20');
});

test('writing and reading back gives the same parameters', () => {
  const params = parse('q=log4j&severity=LOW&expiredOnly=true&direction=ASC&offset=60');

  expect(parseTicketListParams(toSearchParams(params))).toEqual(params);
});
