import { Copy, Download } from 'lucide-react';
import { Badge, Button } from '../ui';

type ExportStatus = {
  errorCount: number;
  warningCount: number;
  isReady: boolean;
};

type YamlExportPanelProps = {
  exportStatus: ExportStatus;
  feedback: string;
  onCopy: () => void;
  onDownload: () => void;
};

export function YamlExportPanel({
  exportStatus,
  feedback,
  onCopy,
  onDownload,
}: YamlExportPanelProps) {
  return (
    <section
      aria-label="YAML 导出"
      className="flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-[#d9d1c4] bg-[#fffaf2] p-2.5"
    >
      <div className="flex flex-wrap gap-1.5">
        <Badge variant={exportStatus.isReady ? 'success' : 'error'}>
          {exportStatus.isReady ? 'export ready' : `${exportStatus.errorCount} errors`}
        </Badge>
        <Badge>{exportStatus.warningCount} warnings</Badge>
        {feedback ? <Badge>{feedback}</Badge> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button title="复制 YAML" onClick={onCopy} disabled={!exportStatus.isReady}>
          <Copy size={16} />
          复制
        </Button>
        <Button
          title="下载 YAML"
          variant="primary"
          onClick={onDownload}
          disabled={!exportStatus.isReady}
        >
          <Download size={16} />
          下载
        </Button>
      </div>
    </section>
  );
}
