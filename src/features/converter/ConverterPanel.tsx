import type { ReactNode } from 'react';

type ConverterPanelProps = {
  children: ReactNode;
};

export function ConverterPanel({ children }: ConverterPanelProps) {
  return <aside className="flex flex-1 min-h-0 flex-col gap-3 overflow-auto p-3.5">{children}</aside>;
}
