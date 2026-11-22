import type { ReactNode } from 'react';

/** Small rounded label, used for file types such as `.py`. */
export const Chip = ({ children }: { children: ReactNode }) => (
  <span className="rounded-full border bg-card px-2.5 py-0.5 font-mono text-xs">
    {children}
  </span>
);