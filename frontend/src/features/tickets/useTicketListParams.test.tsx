import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';

import { DEFAULT_PARAMS } from './ticketListParams.ts';
import { useTicketListParams } from './useTicketListParams.ts';

function renderParams(url = '/tickets') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  );
  const { result } = renderHook(
    () => ({ ...useTicketListParams(), location: useLocation(), navigate: useNavigate() }),
    { wrapper },
  );
  const search = () => result.current.location.search;
  return { result, search };
}

test('reads valid parameters with defaults from the URL', () => {
  const { result } = renderParams('/tickets?q=log4j&state=IN_PROGRESS&offset=20');

  expect(result.current.params).toEqual({
    ...DEFAULT_PARAMS,
    q: 'log4j',
    state: ['IN_PROGRESS'],
    offset: 20,
  });
});

test('a manipulated URL never reaches the page as is', () => {
  const { result } = renderParams('/tickets?offset=-5&limit=9999&state=FOO');

  expect(result.current.params).toEqual(DEFAULT_PARAMS);
});

test('changing a filter goes back to the first page', () => {
  const { result, search } = renderParams('/tickets?q=log4j&offset=40');

  act(() => {
    result.current.setFilters({ severity: ['CRITICAL'] });
  });

  expect(search()).toBe('?q=log4j&severity=CRITICAL');
  expect(result.current.params.offset).toBe(0);
});

test('changing the order goes back to the first page', () => {
  const { result, search } = renderParams('/tickets?offset=40');

  act(() => {
    result.current.setFilters({ sort: 'KEY', direction: 'ASC' });
  });

  expect(search()).toBe('?sort=KEY&direction=ASC');
});

test('changing the page keeps the filters', () => {
  const { result, search } = renderParams('/tickets?q=log4j&state=DONE&sort=KEY');

  act(() => {
    result.current.setPage(20);
  });

  expect(search()).toBe('?q=log4j&state=DONE&sort=KEY&offset=20');
});

test('parameters set to their default disappear from the URL', () => {
  const { result, search } = renderParams('/tickets?q=log4j&sort=KEY');

  act(() => {
    result.current.setFilters({ q: '', sort: 'LAST_MODIFIED' });
  });

  expect(search()).toBe('');
});

test('reset goes back to the defaults and a clean URL', () => {
  const { result, search } = renderParams('/tickets?q=log4j&state=DONE&offset=20&limit=50');

  act(() => {
    result.current.reset();
  });

  expect(search()).toBe('');
  expect(result.current.params).toEqual(DEFAULT_PARAMS);
});

test('the browser back button restores the previous parameters', () => {
  const { result } = renderParams('/tickets?q=log4j');

  act(() => {
    result.current.setPage(20);
  });
  act(() => {
    void result.current.navigate(-1);
  });

  expect(result.current.params).toEqual({ ...DEFAULT_PARAMS, q: 'log4j' });
});

test('a change that leaves the URL as it is does not add a history entry', () => {
  const { result } = renderParams('/tickets?q=log4j');
  const key = result.current.location.key;

  act(() => {
    result.current.setFilters({ q: 'log4j' });
  });

  expect(result.current.location.key).toBe(key);
});
