import { CheckCircle2, Download, FileText, WandSparkles } from 'lucide-react';
import { Button, Toolbar } from '../ui';

type TopbarProps = {
  canConfirm: boolean;
  isExportReady: boolean;
  onGenerateOutline: () => void;
  onConfirmOutline: () => void;
  onDownloadYaml: () => void;
};

export function Topbar({
  canConfirm,
  isExportReady,
  onGenerateOutline,
  onConfirmOutline,
  onDownloadYaml,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">月</span>
        <div className="brand-copy">
          <span className="brand-title">月点</span>
          <span className="brand-subtitle">AI 剧本创作工作台</span>
        </div>
      </div>
      <Toolbar className="topbar-actions">
        <Button title="导入小说">
          <FileText size={16} />
          导入
        </Button>
        <Button title="生成改编大纲" variant="primary" onClick={onGenerateOutline}>
          <WandSparkles size={16} />
          大纲
        </Button>
        <Button title="确认大纲并写入剧本" onClick={onConfirmOutline} disabled={!canConfirm}>
          <CheckCircle2 size={16} />
          写入
        </Button>
        <Button title="下载 YAML" onClick={onDownloadYaml} disabled={!isExportReady}>
          <Download size={16} />
          YAML
        </Button>
      </Toolbar>
    </header>
  );
}
