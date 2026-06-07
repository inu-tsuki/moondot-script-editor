import { CheckCircle2, Download, FileText, WandSparkles } from 'lucide-react';
import type { ModelProviderType } from '../../core/model';
import { Button, Toolbar } from '../ui';

type TopbarProps = {
  /** Plan exists and Writer draft is neither pending nor applied. */
  canGenerate: boolean;
  /** Writer draft is available and not yet applied to document. */
  canApply: boolean;
  isExportReady: boolean;
  onGenerateOutline: () => void;
  onGenerateDraft: () => void;
  onApplyDraft: () => void;
  onDownloadYaml: () => void;
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
  canGenerate,
  canApply,
  isExportReady,
  onGenerateOutline,
  onGenerateDraft,
  onApplyDraft,
  onDownloadYaml,
  providerType,
  isProxyAvailable,
  isProbing,
  onProviderChange,
}: TopbarProps) {
  const isProxy = providerType === 'local_proxy';

  const handleToggle = () => {
    if (isProbing) return;
    // If proxy is unavailable, only mock is possible — no toggle.
    if (!isProxyAvailable && !isProxy) return;
    // If on mock and proxy is available, switch to proxy; if on proxy, switch to mock.
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

      <Toolbar className="topbar-actions">
        <Button title="导入小说">
          <FileText size={16} />
          导入
        </Button>
        <Button title="生成改编大纲" variant="primary" onClick={onGenerateOutline}>
          <WandSparkles size={16} />
          大纲
        </Button>
        <Button title="确认大纲并生成剧本" onClick={onGenerateDraft} disabled={!canGenerate}>
          <WandSparkles size={16} />
          剧本
        </Button>
        {canApply && (
          <Button
            title="将生成的 Writer 草稿应用到当前剧本"
            variant="primary"
            onClick={onApplyDraft}
          >
            <CheckCircle2 size={16} />
            应用
          </Button>
        )}
        <Button title="下载 YAML" onClick={onDownloadYaml} disabled={!isExportReady}>
          <Download size={16} />
          YAML
        </Button>
      </Toolbar>
    </header>
  );
}
