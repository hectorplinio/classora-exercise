import { type Page, expect, test } from '@playwright/test';

// Tickets of the backend's deterministic seed.
const SEC_1024 = { key: 'SEC-1024', id: 'b7c1e0de-6f0a-4f43-9a55-0a2f6c1d8e11' }; // REPORTED, Payments
const SEC_1128 = { key: 'SEC-1128', id: '4eb56f37-4f83-5ced-a2c5-8337b5ac9c02' }; // restricted, Mobile

/** Selects a profile with the header selector and waits until the backend confirms it. */
async function selectProfile(page: Page, profile: string, team: string) {
  await page.goto('/tickets');
  await page.getByRole('combobox', { name: 'Perfil' }).selectOption(profile);
  await expect(page.getByRole('group', { name: 'Usuario actual' })).toContainText(team);
}

function field(page: Page, label: string) {
  return page.locator('dt', { hasText: label }).locator('xpath=following-sibling::dd[1]');
}

test('a profile without tickets.update does not see "Fijar fecha compromiso"', async ({ page }) => {
  await selectProfile(page, 'developer', 'Payments');

  await page.goto(`/tickets/${SEC_1024.id}`);

  await expect(page.getByRole('heading', { name: new RegExp(SEC_1024.key) })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Usuario actual' })).toContainText('tickets.read');
  await expect(page.getByRole('form', { name: 'Fijar fecha compromiso' })).toHaveCount(0);
});

test('a profile with tickets.update sets the due date and the ticket moves to "En curso"', async ({
  page,
}) => {
  await selectProfile(page, 'team-lead', 'Payments');
  await page.goto(`/tickets/${SEC_1024.id}`);
  await expect(field(page, 'Estado')).toHaveText('Reportado');

  await page.getByLabel('Fecha compromiso', { exact: true }).fill('2099-01-15');
  await page.getByRole('button', { name: 'Guardar' }).click();

  await expect(page.getByRole('status')).toHaveText('Fecha compromiso guardada.');
  await expect(field(page, 'Estado')).toHaveText('En curso');
  await expect(field(page, 'Fecha compromiso')).toHaveText('15/01/2099');

  // The list shows the new state too.
  await page.getByRole('link', { name: 'Volver al listado' }).click();
  await page.getByRole('searchbox', { name: 'Buscar' }).fill(SEC_1024.key);
  const row = page.getByRole('row', { name: new RegExp(SEC_1024.key) });
  await expect(row).toContainText('En curso');
});

test('a restricted ticket of another team is not listed and its detail is not found', async ({
  page,
}) => {
  // It exists: Security, with tickets.read.all, sees it.
  await selectProfile(page, 'security', 'Security Champions');
  await page.goto('/tickets?limit=100');
  await expect(page.getByRole('link', { name: SEC_1128.key })).toBeVisible();

  await selectProfile(page, 'developer', 'Payments');
  await page.goto('/tickets?limit=100');
  await expect(page.getByText(/Mostrando 1–\d+ de \d+/)).toBeVisible();
  await expect(page.getByRole('link', { name: SEC_1128.key })).toHaveCount(0);

  await page.goto(`/tickets/${SEC_1128.id}`);
  await expect(page.getByRole('heading', { name: 'No encontrado' })).toBeVisible();
});
