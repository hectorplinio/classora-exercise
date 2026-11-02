import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, delay, http } from 'msw';

import { App } from '../../App.tsx';
import type { Ticket } from '../../api/generated/types.gen.ts';
import { aTicket } from '../../test/builders.ts';
import { apiUrl, currentUserHandler, problem, ticketPage } from '../../test/handlers.ts';
import { renderWithProviders } from '../../test/render.tsx';
import { server } from '../../test/server.ts';

const FUTURE = '2099-01-15';

/**
 * A tiny backend: GET /tickets filters `tickets` by state, PATCH updates them as the server
 * does (REPORTED → IN_PROGRESS) after `patchDelay` ms, or answers `patchError` instead.
 */
function backend(
  initial: Ticket[],
  { patchDelay = 0, patchError }: { patchDelay?: number; patchError?: number } = {},
) {
  let tickets = initial;
  return [
    http.get(apiUrl('/tickets'), ({ request }) => {
      const states = new URL(request.url).searchParams.getAll('state');
      return HttpResponse.json(ticketPage(tickets.filter((t) => states.includes(t.state))));
    }),
    http.patch(apiUrl('/tickets/:id'), async ({ request, params }) => {
      await delay(patchDelay);
      if (patchError) return problem(patchError);
      const { dueDate } = (await request.json()) as { dueDate: string };
      let updated: Ticket | undefined;
      tickets = tickets.map((ticket) => {
        if (ticket.id !== params.id) return ticket;
        const state = ticket.state === 'REPORTED' ? 'IN_PROGRESS' : ticket.state;
        updated = { ...ticket, dueDate, state };
        return updated;
      });
      return HttpResponse.json(updated);
    }),
  ];
}

function selectTeamLead() {
  localStorage.setItem('mini-tickets.profile', 'team-lead');
}

const row = async (key: string) =>
  (await screen.findByRole('rowheader', { name: key })).closest('tr') as HTMLElement;

async function openEditor(key: string) {
  await userEvent.click(
    await screen.findByRole('button', { name: `Fijar fecha compromiso de ${key}` }),
  );
  return screen.getByRole('form', { name: `Fijar fecha compromiso de ${key}` });
}

async function saveDate(key: string, date: string) {
  const form = await openEditor(key);
  fireEvent.change(within(form).getByLabelText('Fecha compromiso'), { target: { value: date } });
  await userEvent.click(within(form).getByRole('button', { name: 'Guardar' }));
}

test('a profile without tickets.update does not see the action in the rows', async () => {
  server.use(currentUserHandler, ...backend([aTicket({ key: 'SEC-1' })]));
  renderWithProviders(<App />, { route: '/tickets' });

  await row('SEC-1');

  expect(screen.queryByRole('columnheader', { name: 'Acción' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Fijar fecha/ })).not.toBeInTheDocument();
});

test('a DONE ticket does not offer the action', async () => {
  selectTeamLead();
  server.use(currentUserHandler, ...backend([aTicket({ key: 'SEC-1', state: 'DONE' })]));
  renderWithProviders(<App />, { route: '/tickets' });

  await row('SEC-1');

  expect(screen.getByRole('columnheader', { name: 'Acción' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Fijar fecha/ })).not.toBeInTheDocument();
});

test('the row shows the new date and "En curso" before the server answers', async () => {
  selectTeamLead();
  server.use(
    currentUserHandler,
    ...backend([aTicket({ key: 'SEC-1', state: 'REPORTED' })], { patchDelay: 100 }),
  );
  renderWithProviders(<App />, { route: '/tickets' });

  await saveDate('SEC-1', FUTURE);

  const cells = within(await row('SEC-1'));
  expect(cells.getByText('En curso')).toBeInTheDocument();
  expect(cells.getByText('15/01/2099')).toBeInTheDocument();
  expect(cells.getByRole('button', { name: 'Fijar fecha compromiso de SEC-1' })).toHaveTextContent(
    'Guardando…',
  );
  // The server confirms it: the action is available again, with no error.
  await waitFor(() => {
    expect(cells.getByRole('button', { name: 'Fijar fecha compromiso de SEC-1' })).toBeEnabled();
  });
  expect(cells.queryByRole('alert')).not.toBeInTheDocument();
  expect(cells.getByText('En curso')).toBeInTheDocument();
});

test.each([
  [403, 'No tienes permiso para realizar esta acción.'],
  [409, 'La acción no es posible en el estado actual del ticket.'],
])('a %i reverts the row and tells the user why', async (status, message) => {
  selectTeamLead();
  server.use(
    currentUserHandler,
    ...backend([aTicket({ key: 'SEC-1', state: 'REPORTED' })], { patchError: status }),
  );
  renderWithProviders(<App />, { route: '/tickets' });

  await saveDate('SEC-1', FUTURE);

  const cells = within(await row('SEC-1'));
  expect(await cells.findByRole('alert')).toHaveTextContent(message);
  expect(cells.getByText('Reportado')).toBeInTheDocument();
  expect(cells.queryByText('15/01/2099')).not.toBeInTheDocument();
});

test('a row that no longer matches the filter stays, updated, until the list reloads', async () => {
  selectTeamLead();
  server.use(
    currentUserHandler,
    ...backend([aTicket({ key: 'SEC-1', state: 'REPORTED' }), aTicket({ key: 'SEC-2' })], {
      patchDelay: 100,
    }),
  );
  renderWithProviders(<App />, { route: '/tickets?state=REPORTED' });

  await saveDate('SEC-1', FUTURE);

  // Optimistic: still listed, already "En curso" (it no longer matches state=REPORTED).
  expect(within(await row('SEC-1')).getByText('En curso')).toBeInTheDocument();
  // The server decides: once the list reloads, the ticket leaves the filtered list.
  await waitFor(() => {
    expect(screen.queryByRole('rowheader', { name: 'SEC-1' })).not.toBeInTheDocument();
  });
  expect(screen.getByRole('rowheader', { name: 'SEC-2' })).toBeInTheDocument();
});

test('a date before today is rejected without calling the backend', async () => {
  selectTeamLead();
  const patches: unknown[] = [];
  server.use(
    currentUserHandler,
    http.patch(apiUrl('/tickets/:id'), () => {
      patches.push(true);
      return problem(500);
    }),
    ...backend([aTicket({ key: 'SEC-1' })]),
  );
  renderWithProviders(<App />, { route: '/tickets' });

  await saveDate('SEC-1', '2000-01-01');

  const form = screen.getByRole('form', { name: 'Fijar fecha compromiso de SEC-1' });
  expect(within(form).getByLabelText('Fecha compromiso')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByText('La fecha no puede ser anterior a hoy.')).toBeInTheDocument();
  expect(patches).toEqual([]);
});

test('Cancelar and Escape close the editor and give the focus back to the action', async () => {
  selectTeamLead();
  server.use(currentUserHandler, ...backend([aTicket({ key: 'SEC-1' })]));
  renderWithProviders(<App />, { route: '/tickets' });
  const action = () => screen.getByRole('button', { name: 'Fijar fecha compromiso de SEC-1' });

  const form = await openEditor('SEC-1');
  expect(within(form).getByLabelText('Fecha compromiso')).toHaveFocus();
  await userEvent.click(within(form).getByRole('button', { name: 'Cancelar' }));
  expect(action()).toHaveFocus();

  await openEditor('SEC-1');
  await userEvent.keyboard('{Tab}'); // Any other key keeps it open.
  expect(screen.getByRole('form', { name: 'Fijar fecha compromiso de SEC-1' })).toBeInTheDocument();
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('form')).not.toBeInTheDocument();
  expect(action()).toHaveFocus();
});

test('using the action does not open the detail', async () => {
  selectTeamLead();
  server.use(currentUserHandler, ...backend([aTicket({ key: 'SEC-1' })]));
  renderWithProviders(<App />, { route: '/tickets' });

  await openEditor('SEC-1');

  expect(screen.getByRole('heading', { name: 'Tickets' })).toBeInTheDocument();
});
