import { createEvent, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';

import { App } from '../../App.tsx';
import { aTicket } from '../../test/builders.ts';
import {
  apiUrl,
  currentUserHandler,
  problem,
  ticketPage,
  ticketsHandler,
} from '../../test/handlers.ts';
import { renderWithProviders } from '../../test/render.tsx';
import { server } from '../../test/server.ts';

const rows = async () => {
  const table = await screen.findByRole('table');
  return within(table).getAllByRole('row').slice(1);
};
const rowKeys = async () =>
  (await rows()).map((row) => within(row).getByRole('rowheader').textContent);

test('lists the tickets with their labels', async () => {
  server.use(
    currentUserHandler,
    ticketsHandler([
      aTicket({
        key: 'SEC-1',
        state: 'IN_PROGRESS',
        severity: 'CRITICAL',
        expired: true,
        dueDate: '2026-12-01',
      }),
    ]),
  );
  renderWithProviders(<App />, { route: '/tickets' });

  const [row] = await rows();

  expect(row).toBeDefined();
  const cells = within(row as HTMLElement);
  expect(cells.getByText('SEC-1')).toBeInTheDocument();
  expect(cells.getByText('En curso')).toBeInTheDocument();
  expect(cells.getByText('Crítica')).toBeInTheDocument();
  expect(cells.getByText('Caducado')).toBeInTheDocument();
  expect(cells.getByText('30/11/2026')).toBeInTheDocument();
  expect(cells.getByText('01/12/2026')).toBeInTheDocument();
});

test('the request is built from the URL, normalized', async () => {
  const requests: URL[] = [];
  server.use(currentUserHandler, ticketsHandler([aTicket()], (url) => requests.push(url)));
  renderWithProviders(<App />, { route: '/tickets?offset=-5&limit=9999&state=FOO&q=log4j' });

  await rows();

  const query = requests.at(-1)?.searchParams;
  expect(query?.get('offset')).toBe('0');
  expect(query?.get('limit')).toBe('20');
  expect(query?.get('q')).toBe('log4j');
  expect(query?.getAll('state')).toEqual(['REPORTED', 'IN_PROGRESS', 'PENDING_SECURITY', 'DONE']);
});

test('the next page keeps the filters and loads the following tickets', async () => {
  const tickets = Array.from({ length: 25 }, (_, i) => aTicket({ key: `SEC-${String(i + 1)}` }));
  server.use(currentUserHandler, ticketsHandler(tickets));
  renderWithProviders(<App />, { route: '/tickets' });
  expect(await rowKeys()).toHaveLength(20);

  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

  await waitFor(async () => {
    expect(await rowKeys()).toEqual(['SEC-21', 'SEC-22', 'SEC-23', 'SEC-24', 'SEC-25']);
  });
  expect(screen.getByText('Mostrando 21–25 de 25')).toBeInTheDocument();
});

test('filtering by state sends only the selected states and returns to the first page', async () => {
  const requests: URL[] = [];
  server.use(currentUserHandler, ticketsHandler([aTicket()], (url) => requests.push(url)));
  renderWithProviders(<App />, { route: '/tickets?offset=20' });
  await screen.findByRole('table');

  await userEvent.click(screen.getByRole('checkbox', { name: 'Hecho' }));

  await waitFor(() => {
    const query = requests.at(-1)?.searchParams;
    expect(query?.getAll('state')).toEqual(['REPORTED', 'IN_PROGRESS', 'PENDING_SECURITY']);
    expect(query?.get('offset')).toBe('0');
  });
});

test('the last selected state cannot be unchecked', async () => {
  server.use(currentUserHandler, ticketsHandler([]));
  renderWithProviders(<App />, { route: '/tickets?state=DONE' });

  expect(await screen.findByRole('checkbox', { name: 'Hecho' })).toBeDisabled();
});

test('clicking a column header sorts by it, and again reverses the order', async () => {
  const requests: URL[] = [];
  server.use(currentUserHandler, ticketsHandler([aTicket()], (url) => requests.push(url)));
  renderWithProviders(<App />, { route: '/tickets' });
  await screen.findByRole('table');

  await userEvent.click(screen.getByRole('button', { name: /Clave/ }));
  await waitFor(() => {
    expect(screen.getByRole('columnheader', { name: /Clave/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });
  await userEvent.click(screen.getByRole('button', { name: /Clave/ }));

  await waitFor(() => {
    expect(requests.at(-1)?.searchParams.get('direction')).toBe('DESC');
  });
  expect(requests.at(-1)?.searchParams.get('sort')).toBe('KEY');
});

test('an empty result says so', async () => {
  server.use(currentUserHandler, ticketsHandler([]));
  renderWithProviders(<App />, { route: '/tickets' });

  expect(await screen.findByText('No hay tickets que cumplan los filtros.')).toBeInTheDocument();
});

test('a backend error is shown instead of the table', async () => {
  server.use(currentUserHandler, http.get(apiUrl('/tickets'), () => problem(403)));
  renderWithProviders(<App />, { route: '/tickets' });

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No tienes permiso para realizar esta acción.',
  );
});

test("switching profile never shows the previous profile's tickets", async () => {
  server.use(
    currentUserHandler,
    http.get(apiUrl('/tickets'), async ({ request }) => {
      if (request.headers.get('X-User-Team') === 'Payments') {
        return HttpResponse.json(ticketPage([aTicket({ key: 'SEC-1' })]));
      }
      await delay(50);
      return HttpResponse.json(ticketPage([aTicket({ key: 'SEC-2' })]));
    }),
  );
  renderWithProviders(<App />, { route: '/tickets' });
  expect(await rowKeys()).toEqual(['SEC-1']);

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Perfil' }), 'security');

  expect(screen.queryByText('SEC-1')).not.toBeInTheDocument();
  expect(await screen.findByText('SEC-2')).toBeInTheDocument();
});

describe('filters', () => {
  async function renderList(route = '/tickets') {
    const requests: URL[] = [];
    server.use(currentUserHandler, ticketsHandler([aTicket()], (url) => requests.push(url)));
    renderWithProviders(<App />, { route });
    await screen.findByRole('table');
    const lastQuery = () => requests.at(-1)?.searchParams;
    return { requests, lastQuery };
  }

  test('typing a search sends one request after the user stops typing', async () => {
    const { requests, lastQuery } = await renderList('/tickets?offset=20');
    const before = requests.length;

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar' }), 'log4j');

    await waitFor(() => {
      expect(lastQuery()?.get('q')).toBe('log4j');
    });
    expect(requests).toHaveLength(before + 1);
    expect(lastQuery()?.get('offset')).toBe('0');
  });

  test('filters by assigned team', async () => {
    const { lastQuery } = await renderList();

    await userEvent.type(screen.getByRole('textbox', { name: 'Equipo asignado' }), 'Mobile');

    await waitFor(() => {
      expect(lastQuery()?.get('assignedTeam')).toBe('Mobile');
    });
  });

  test('filters by severity', async () => {
    const { lastQuery } = await renderList();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Baja' }));

    await waitFor(() => {
      expect(lastQuery()?.getAll('severity')).toEqual(['CRITICAL', 'HIGH', 'MEDIUM']);
    });
  });

  test('submitting the filters form never reloads the page', async () => {
    await renderList();

    const submit = createEvent.submit(screen.getByRole('search', { name: 'Filtros' }));
    fireEvent(screen.getByRole('search', { name: 'Filtros' }), submit);

    expect(submit.defaultPrevented).toBe(true);
  });

  test('shows only expired tickets', async () => {
    const { lastQuery } = await renderList();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Solo caducados' }));

    await waitFor(() => {
      expect(lastQuery()?.get('expiredOnly')).toBe('true');
    });
  });

  test('"Limpiar filtros" goes back to the default list', async () => {
    const { lastQuery } = await renderList('/tickets?q=log4j&state=DONE&expiredOnly=true');

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    await waitFor(() => {
      expect(lastQuery()?.get('q')).toBe('');
    });
    expect(lastQuery()?.getAll('state')).toHaveLength(4);
    expect(lastQuery()?.get('expiredOnly')).toBe('false');
    expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveValue('');
  });
});

describe('pagination', () => {
  const tickets = Array.from({ length: 25 }, (_, i) => aTicket({ key: `SEC-${String(i + 1)}` }));

  test('the previous page goes back', async () => {
    server.use(currentUserHandler, ticketsHandler(tickets));
    renderWithProviders(<App />, { route: '/tickets?offset=20' });
    expect(await screen.findByText('Mostrando 21–25 de 25')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }));

    expect(await screen.findByText('Mostrando 1–20 de 25')).toBeInTheDocument();
  });

  test('a page past the end offers the first one', async () => {
    server.use(currentUserHandler, ticketsHandler(tickets));
    renderWithProviders(<App />, { route: '/tickets?offset=100' });
    expect(await screen.findByText('Esta página no tiene tickets.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ir a la primera página' }));

    expect(await screen.findByText('Mostrando 1–20 de 25')).toBeInTheDocument();
  });
});
