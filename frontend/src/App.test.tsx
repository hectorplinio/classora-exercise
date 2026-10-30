import { render, screen } from '@testing-library/react';

import { App } from './App.tsx';

test('renders the application title', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Mini Tickets' })).toBeInTheDocument();
});
