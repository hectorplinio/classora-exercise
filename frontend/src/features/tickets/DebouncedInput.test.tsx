import { act, fireEvent, render, screen } from '@testing-library/react';

import { DEBOUNCE_MS, DebouncedInput } from './DebouncedInput.tsx';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

test('reports the value once, after the user stops typing', () => {
  const onChange = vi.fn();
  render(<DebouncedInput aria-label="Buscar" value="" onChange={onChange} />);

  const input = screen.getByRole('textbox', { name: 'Buscar' });

  for (const text of ['l', 'lo', 'log', 'log4', 'log4j']) {
    fireEvent.change(input, { target: { value: text } });
    act(() => {
      vi.advanceTimersByTime(DEBOUNCE_MS - 1);
    });
  }
  expect(onChange).not.toHaveBeenCalled();

  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(onChange).toHaveBeenCalledExactlyOnceWith('log4j');
});

test('shows a value that changes from outside, e.g. with the back button', () => {
  const { rerender } = render(<DebouncedInput aria-label="Buscar" value="log4j" onChange={vi.fn()} />);

  rerender(<DebouncedInput aria-label="Buscar" value="openssl" onChange={vi.fn()} />);

  expect(screen.getByRole('textbox', { name: 'Buscar' })).toHaveValue('openssl');
});
