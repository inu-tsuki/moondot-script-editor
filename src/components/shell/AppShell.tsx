import type { ReactNode } from 'react';
import type { ModelProviderType } from '../../core/model';
import { Topbar } from './Topbar';

type AppShellProps = {
  children: ReactNode;
  providerType: ModelProviderType;
  isProxyAvailable: boolean;
  isProbing: boolean;
  onProviderChange: (p: ModelProviderType) => void;
};

/**
 * Application chrome: topbar + main content area.
 *
 * Layout composition (dock, workspace wrappers) is the responsibility of the
 * children passed in — AppShell only provides the outer frame.
 */
export function AppShell({
  children,
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
      {children}
    </div>
  );
}
