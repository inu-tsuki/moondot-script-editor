import { CheckCircle2, Download, WandSparkles } from 'lucide-react';
import { Button, Toolbar } from '../../components/ui';

type ConverterActionsProps = {
  canGenerate: boolean;
  canApply: boolean;
  isExportReady: boolean;
  onGenerateOutline: () => void;
  onGenerateDraft: () => void;
  onApplyDraft: () => void;
  onDownloadYaml: () => void;
};

export function ConverterActions({
  canGenerate,
  canApply,
  isExportReady,
  onGenerateOutline,
  onGenerateDraft,
  onApplyDraft,
  onDownloadYaml,
}: ConverterActionsProps) {
  return (
    <Toolbar className="converter-actions">
      <Button title="生成改编大纲" variant="primary" onClick={onGenerateOutline}>
        <WandSparkles size={16} />
        大纲
      </Button>
      <Button title="确认大纲并生成剧本" onClick={onGenerateDraft} disabled={!canGenerate}>
        <WandSparkles size={16} />
        剧本
      </Button>
      {canApply && (
        <Button title="将生成的 Writer 草稿应用到当前剧本" variant="primary" onClick={onApplyDraft}>
          <CheckCircle2 size={16} />
          应用
        </Button>
      )}
      <Button title="下载 YAML" onClick={onDownloadYaml} disabled={!isExportReady}>
        <Download size={16} />
        YAML
      </Button>
    </Toolbar>
  );
}
