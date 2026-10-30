import type { Ticket } from '../api/generated/types.gen.ts';
import { zTicket } from '../api/generated/zod.gen.ts';

let sequence = 1000;

/** A valid ticket (checked against the contract's schema), with the given overrides. */
export function aTicket(overrides: Partial<Ticket> = {}): Ticket {
  sequence += 1;
  return zTicket.parse({
    id: crypto.randomUUID(),
    key: `SEC-${String(sequence)}`,
    title: 'Log4j vulnerable version in payments-api',
    asset: 'payments-api',
    creatorTeam: 'Security Champions',
    assignedTeam: 'Payments',
    assignee: 'jdoe@example.com',
    severity: 'HIGH',
    state: 'REPORTED',
    restricted: false,
    targetDate: '2026-11-30',
    dueDate: null,
    expired: false,
    createdAt: '2026-10-01T09:12:00Z',
    lastModified: '2026-10-20T15:40:00Z',
    ...overrides,
  });
}
