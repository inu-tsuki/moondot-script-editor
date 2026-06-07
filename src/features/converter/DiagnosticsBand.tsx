import { AlertTriangle } from 'lucide-react';
import type { Diagnostic } from '../../core/validation';

type DiagnosticsBandProps = {
  diagnostics: Diagnostic[];
};

export function DiagnosticsBand({ diagnostics }: DiagnosticsBandProps) {
  if (diagnostics.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 py-1">
      {diagnostics.map((diagnostic, index) => (
        <div
          className="flex items-start gap-2 rounded border border-[#ebce7a] bg-[#fff6db] px-2 py-1.5 text-[11px] leading-relaxed text-[#5e4a15]"
          key={`${diagnostic.code}-${diagnostic.path}-${index}`}
        >
          <AlertTriangle className="mt-px shrink-0" size={14} />
          <span>
            {diagnostic.message}
            {diagnostic.suggestion ? ` ${diagnostic.suggestion}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
