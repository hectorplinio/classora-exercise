import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';

import { App } from '../../App.tsx';
import type { Ticket } from '../../api/generated/types.gen.ts';
import { aTicket } from '../../test/builders.ts';
import { apiUrl, currentUserHandler, problem, ticketsHandler } from '../../test/handlers.ts';
import { renderWithProviders } from '../../test/render.tsx';
import { server } from '../../test/server.ts';

const FUTURE = '2099-01-15';

/** GET and PATCH of one ticket, answering like the backend (REPORTED → IN_PROGRESS). */
function ticketHandlers(initial: Ticket, onPatch?: (body: unknown) => void) {
  let ticket = initial;
  return [
    http.get(apiUrl(`/tickets/${ticket.id}`), () => HttpResponse.json(ticket)),
    http.patch(apiUrl(`/tickets/${ticket.id}`), async ({ request }) => {
      const body = (await request.json()) as { dueDate: string };
      onPatch?.(body);
      const state = ticket.state === 'REPORTED' ? 'IN_PROGRESS' : ticket.state;
      ticket = { ...ticket, dueDate: body.dueDate, state, lastModified: new Date().toISOString() };
      return HttpResponse.json(ticket);
    }),
  ];
}

function selectTeamLead() {
  localStorage.setItem('mini-tickets.profile', 'team-lead');
}

const field = (label: string) => {
  const term = screen.getByText(label, { selector: 'dt' });
  return term.nextElementSibling as HTMLElement;
};

async function setDueDate(date: string) {
  fireEvent.change(await screen.findByLabelText('Fecha compromiso'), { target: { value: date } });
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
}

test('shows every field of the ticket', async () => {
  const ticket = aTicket({ key: 'SEC-7', title: 'Open redirect', expired: true, restricted: true });
  server.use(currentUserHandler, ...ticketHandlers(ticket));
  renderWithProviders(<App />, { route: `/tickets/${ticket.id}` });

  expect(await screen.findByRole('heading', { name: 'SEC-7 · Open redirect' })).toBeInTheDocument();
  expect(field('Equipo asignado')).toHaveTextContent('Payments');
  expect(field('Estado')).toHaveTextContent('Reportado');
  expect(field('Restringido')).toHaveTextContent('Sí');
  expect(field('Fecha límite')).toHaveTextContent('30/11/2026 Caducado');
  expect(field('Fecha compromiso')).toHaveTextContent('—');
});

test('a ticket that does not exist or is not visible shows "not found"', async () => {
  const id = crypto.randomUUID();
  server.use(currentUserHandler, http.get(apiUrl(`/tickets/${id}`), () => problem(404)));
  renderWithProviders(<App />, { route: `/tickets/${id}` });

  expect(await screen.findByRole('heading', { name: 'No encontrado' })).toBeInTheDocument();
});

test('a malformed id shows "not found" without asking the backend', () => {
  server.use(currentUserHandler);
  renderWithProviders(<App />, { route: '/tickets/not-a-uuid' });

  expect(screen.getByRole('heading', { name: 'No encontrado' })).toBeInTheDocument();
});

test('other errors are shown with their message', async () => {
  const id = crypto.randomUUID();
  server.use(currentUserHandler, http.get(apiUrl(`/tickets/${id}`), () => problem(403)));
  renderWithProviders(<App />, { route: `/tickets/${id}` });

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No tienes permiso para realizar esta acción.',
  );
});

test('a profile without tickets.update does not see the action', async () => {
  const ticket = aTicket();
  server.use(currentUserHandler, ...ticketHandlers(ticket));
  renderWithProviders(<App />, { route: `/tickets/${ticket.id}` });

  await screen.findByRole('heading', { name: new RegExp(ticket.key) });
  await screen.findByRole('group', { name: 'Usuario actual' });

  expect(screen.queryByRole('form', { name: 'Fijar fecha compromiso' })).not.toBeInTheDocument();
});

test('a profile with tickets.update sets the date and the ticket moves to "En curso"', async () => {
  selectTeamLead();
  const ticket = aTicket({ state: 'REPORTED' });
  const patches: unknown[] = [];
  server.use(currentUserHandler, ...ticketHandlers(ticket, (body) => patches.push(body)));
  renderWithProviders(<App />, { route: `/tickets/${ticket.id}` });

  await setDueDate(FUTURE);

  expect(await screen.findByRole('status')).toHaveTextContent('Fecha compromiso guardada.');
  expect(patches).toEqual([{ dueDate: FUTURE }]);
  expect(field('Estado')).toHaveTextContent('En curso');
  expect(field('Fecha compromiso')).toHaveTextContent('15/01/2099');
});

test('a date before today is rejected without calling the backend', async () => {
  selectTeamLead();
  const ticket = aTicket();
  const patches: unknown[] = [];
  server.use(currentUserHandler, ...ticketHandlers(ticket, (body) => patches.push(body)));
  renderWithProviders(<App />, { route: `/tickets/${ticket.id}` });

  await setDueDate('2000-01-01');

  expect(await screen.findByText('La fecha no puede ser anterior a hoy.')).toBeInTheDocument();
  expect(screen.getByLabelText('Fecha compromiso')).toHaveAttribute('aria-invalid', 'true');
  expect(patches).toEqual([]);
});

test.each([
  [403, 'No tienes permiso para realizar esta acción.'],
  [409, 'La acción no es posible en el estado actual del ticket.'],
  [422, 'Hay datos no válidos.'],
])('a %i from the backend is shown below the form', async (status, message) => {
  selectTeamLead();
  const ticket = aTicket();
  server.use(
    currentUserHandler,
    http.patch(apiUrl(`/tickets/${ticket.id}`), () => problem(status)),
    ...ticketHandlers(ticket),
  );
  renderWithProviders(<App />, { route: `/tickets/${ticket.id}` });

  await setDueDate(FUTURE);

  const form = screen.getByRole('form', { name: 'Fijar fecha compromiso' });
  expect(await within(form).findByRole('alert')).toHaveTextContent(message);
  expect(field('Estado')).toHaveTextContent('Reportado');
});

test('a DONE ticket explains why its date cannot be set', async () => {
  selectTeamLead();
  const ticket = aTicket({ state: 'DONE' });
  server.use(currentUserHandler, ...ticketHandlers(ticket));
  renderWithProviders(<App />, { route: `/tickets/${ticket.id}` });

  expect(await screen.findByText(/El ticket está cerrado/)).toBeInTheDocument();
  expect(screen.queryByRole('form', { name: 'Fijar fecha compromiso' })).not.toBeInTheDocument();
});

test('from the list to the detail and back, keeping the filters', async () => {
  const ticket = aTicket({ key: 'SEC-1' });
  server.use(currentUserHandler, ticketsHandler([ticket]), ...ticketHandlers(ticket));
  renderWithProviders(<App />, { route: '/tickets?q=sec&sort=KEY' });

  await userEvent.click(await screen.findByRole('link', { name: 'SEC-1' }));
  await userEvent.click(await screen.findByRole('link', { name: '← Volver al listado' }));

  expect(await screen.findByRole('searchbox', { name: 'Buscar' })).toHaveValue('sec');
});

test('saving a date invalidates every cached list of the profile', async () => {
  selectTeamLead();
  const ticket = aTicket({ key: 'SEC-1' });
  server.use(currentUserHandler, ticketsHandler([ticket]), ...ticketHandlers(ticket));
  const { queryClient } = renderWithProviders(<App />, { route: '/tickets' });
  await userEvent.click(await screen.findByRole('link', { name: 'SEC-1' }));

  await setDueDate(FUTURE);
  await screen.findByRole('status');

  const lists = queryClient.getQueryCache().findAll({ queryKey: ['team-lead', 'tickets'] });
  expect(lists).not.toHaveLength(0);
  expect(lists.every((query) => query.state.isInvalidated)).toBe(true);
});
