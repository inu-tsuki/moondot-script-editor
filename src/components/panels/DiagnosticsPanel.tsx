import { AlertTriangle } from 'lucide-react';
import type { Diagnostic } from '../../core/validation';

type DiagnosticsPanelProps = {
  diagnostics: Diagnostic[];
};

export function DiagnosticsPanel({ diagnostics }: DiagnosticsPanelProps) {
  return (
    <div className="grid gap-2">
      {diagnostics.map((diagnostic, index) => (
        <div
          className="flex items-start gap-2 rounded-md border border-[#ebce7a] bg-[#fff6db] p-2.5 text-xs leading-relaxed text-[#5e4a15]"
          key={`${diagnostic.code}-${diagnostic.path}-${index}`}
        >
          <AlertTriangle className="mt-px shrink-0" size={16} />
          <span>
            {diagnostic.message}
            {diagnostic.suggestion ? ` ${diagnostic.suggestion}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
