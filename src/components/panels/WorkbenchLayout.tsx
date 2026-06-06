import type { ReactNode } from 'react';

type WorkbenchLayoutProps = {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
};

export function WorkbenchLayout({ left, center, right }: WorkbenchLayoutProps) {
  return (
    <main className="workbench">
      {left}
      {center}
      {right}
    </main>
  );
}
