import { type InputHTMLAttributes, useEffect, useState } from 'react';

export const DEBOUNCE_MS = 300;

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
};

/**
 * A text input that reports its value only after the user stops typing, so a search does not
 * fire one request per keystroke. The debounce lives here, in the input, and not in
 * `useTicketListParams`: the URL (and therefore the query) only changes with committed values,
 * and the hook stays a plain mapping of the URL.
 */
export function DebouncedInput({ value, onChange, ...props }: Props) {
  const [text, setText] = useState(value);
  const [committed, setCommitted] = useState(value);

  // The URL changed from outside (back button, reset): show its value.
  if (value !== committed) {
    setCommitted(value);
    setText(value);
  }

  useEffect(() => {
    if (text === value) return;
    const timer = setTimeout(() => {
      onChange(text);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [text, value, onChange]);

  return (
    <input
      {...props}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
      }}
    />
  );
}
