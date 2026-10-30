import type { SVGProps } from 'react';

/** A few stroke icons, inline (no icon library). Decorative: hidden from assistive technology. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4 shrink-0"
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const ChevronLeftIcon = () => (
  <Icon>
    <path d="m15 18-6-6 6-6" />
  </Icon>
);

export const ChevronDownIcon = () => (
  <Icon>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const ChevronRightIcon = () => (
  <Icon>
    <path d="m9 18 6-6-6-6" />
  </Icon>
);

export const ArrowLeftIcon = () => (
  <Icon>
    <path d="M19 12H5m6-6-6 6 6 6" />
  </Icon>
);

export const ResetIcon = () => (
  <Icon>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Icon>
);

export const InboxIcon = () => (
  <Icon className="size-8 shrink-0">
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" />
  </Icon>
);

export const AlertIcon = () => (
  <Icon className="mt-0.5 size-4 shrink-0">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4m0 4h.01" />
  </Icon>
);

export const LockIcon = () => (
  <Icon className="size-3.5 shrink-0">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Icon>
);

export const LogoMark = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7 shrink-0">
    <rect width="32" height="32" rx="7" className="fill-zinc-900" />
    <path
      d="M10 16.5l4 4 8-9"
      stroke="white"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
