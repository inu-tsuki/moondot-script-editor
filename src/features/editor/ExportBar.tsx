import { Copy, Download } from 'lucide-react';
import { Badge, Button } from '../../components/ui';

type ExportBarProps = {
  isReady: boolean;
  errorCount: number;
  warningCount: number;
  feedback: string | null;
  onCopy: () => void;
  onDownload: () => void;
};

/**
 * Compact YAML export toolbar for the Editor workspace.
 *
 * Exports always read from the current Editor `ScreenplayDocument`,
 * never from pending Converter artifacts.
 */
export function ExportBar({
  isReady,
  errorCount,
  warningCount,
  feedback,
  onCopy,
  onDownload,
}: ExportBarProps) {
  return (
    <div className="flex items-center gap-3 border-t border-[#e4ded3] px-4 py-2">
      <Badge variant={isReady ? 'success' : 'error'}>
        {isReady ? 'export ready' : `${errorCount} errors`}
      </Badge>
      {warningCount > 0 && <Badge>{warningCount} warnings</Badge>}
      {feedback && <Badge>{feedback}</Badge>}
      <div className="ml-auto flex gap-2">
        <Button title="复制 YAML" onClick={onCopy} disabled={!isReady}>
          <Copy size={16} />
          复制
        </Button>
        <Button title="下载 YAML" variant="primary" onClick={onDownload} disabled={!isReady}>
          <Download size={16} />
          下载
        </Button>
      </div>
    </div>
  );
}
