import type { ReactNode } from 'react';

type ConverterWorkspaceProps = {
  children: ReactNode;
};

/**
 * Converter workspace wrapper.
 *
 * Scrollable vertical container for source input, preferences, outline,
 * writer draft, and diagnostics.  Owns no business logic — pure layout.
 */
export function ConverterWorkspace({ children }: ConverterWorkspaceProps) {
  return (
    <aside className="flex flex-1 min-h-0 flex-col gap-3 overflow-auto p-3.5">{children}</aside>
  );
}
