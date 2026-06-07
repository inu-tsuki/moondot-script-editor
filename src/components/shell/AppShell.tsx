import type { ReactNode } from 'react';
import type { ModelProviderType } from '../../core/model';
import { Topbar } from './Topbar';

type AppShellProps = {
  center: ReactNode;
  right: ReactNode;
  providerType: ModelProviderType;
  isProxyAvailable: boolean;
  isProbing: boolean;
  onProviderChange: (p: ModelProviderType) => void;
};

export function AppShell({
  center,
  right,
  providerType,
  isProxyAvailable,
  isProbing,
  onProviderChange,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <Topbar
        providerType={providerType}
        isProxyAvailable={isProxyAvailable}
        isProbing={isProbing}
        onProviderChange={onProviderChange}
      />
      <main className="app-main">
        <section className="app-center">{center}</section>
        <section className="app-right">{right}</section>
      </main>
    </div>
  );
}
