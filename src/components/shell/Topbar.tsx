import type { ModelProviderType } from '../../core/model';

type TopbarProps = {
  /** Current model provider type. */
  providerType: ModelProviderType;
  /** Whether /api/model/call is reachable. */
  isProxyAvailable: boolean;
  /** Whether the initial availability probe is still in flight. */
  isProbing: boolean;
  /** Request a provider switch. */
  onProviderChange: (p: ModelProviderType) => void;
};

export function Topbar({
  providerType,
  isProxyAvailable,
  isProbing,
  onProviderChange,
}: TopbarProps) {
  const isProxy = providerType === 'local_proxy';

  const handleToggle = () => {
    if (isProbing) return;
    if (!isProxyAvailable && !isProxy) return;
    if (isProxy) {
      onProviderChange('mock');
    } else if (isProxyAvailable) {
      onProviderChange('local_proxy');
    }
  };

  const canToggle = isProxyAvailable || isProxy;

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">月</span>
        <div className="brand-copy">
          <span className="brand-title">月点</span>
          <span className="brand-subtitle">AI 剧本创作工作台</span>
        </div>
      </div>

      {/* Provider indicator */}
      <button
        type="button"
        className={`provider-toggle ${canToggle && !isProbing ? 'provider-toggle--interactive' : ''}`}
        title={
          isProbing
            ? '正在检测模型后端...'
            : isProxy
              ? '当前：代理模式（真实 API）— 点击切换'
              : isProxyAvailable
                ? '当前：Mock 模式 — 点击切换到代理'
                : 'Mock 模式（Vite dev server 未启动或 /api/model/call 不可用）'
        }
        onClick={handleToggle}
        disabled={!canToggle || isProbing}
      >
        {isProbing ? (
          <span className="provider-dot provider-dot--probing" />
        ) : (
          <span
            className={`provider-dot ${isProxy ? 'provider-dot--proxy' : 'provider-dot--mock'}`}
          />
        )}
        <span className="provider-label">
          {isProbing ? '检测中...' : isProxy ? '代理' : 'Mock'}
        </span>
      </button>
    </header>
  );
}
