import type {
  AdaptationPlan,
  AdaptationPreferences,
  NovelAdaptationTraceStep,
  WriterScenePatch,
} from '../../core/adaptation';
import type { ModelProviderType } from '../../core/model';
import type { Diagnostic } from '../../core/validation';
import { AdaptationPreferencesPanel } from './AdaptationPreferencesPanel';
import { DiagnosticsBand } from './DiagnosticsBand';
import { SceneOutlinePanel } from './SceneOutlinePanel';
import { SourcePanel } from './SourcePanel';
import { WriterDraftPanel } from './WriterDraftPanel';

type ConverterWorkspaceProps = {
  // Source
  chapterCount: number;
  sourceText: string;
  sourceType: string;
  onSourceTextChange: (text: string) => void;
  sourceDiagnostics: Diagnostic[];

  // Preferences
  preferences: AdaptationPreferences;
  onPreferenceChange: <K extends keyof AdaptationPreferences>(
    key: K,
    value: AdaptationPreferences[K],
  ) => void;
  onGenerateOutline: () => void;

  // Scene outline
  plan: AdaptationPlan | undefined;
  trace: NovelAdaptationTraceStep[];
  isGeneratingWriter: boolean;
  hasDraft: boolean;
  isDraftApplied: boolean;
  onGenerateDraft: () => void;
  planProvider: ModelProviderType | null;
  planDiagnostics: Diagnostic[];

  // Writer draft
  writerDraft: WriterScenePatch | null;
  onApplyDraft: () => void;
  draftProvider: ModelProviderType | null;
  documentDiagnostics: Diagnostic[];
};

/**
 * Converter workspace — owns the composition of source input, preferences,
 * scene outline, writer draft, and their inline diagnostics.
 *
 * Scrollable vertical container.  Receives workflow props from App.tsx but
 * handles all internal panel assembly so App.tsx does not need to know the
 * internal card order.
 */
export function ConverterWorkspace({
  chapterCount,
  sourceText,
  sourceType,
  onSourceTextChange,
  sourceDiagnostics,
  preferences,
  onPreferenceChange,
  onGenerateOutline,
  plan,
  trace,
  isGeneratingWriter,
  hasDraft,
  isDraftApplied,
  onGenerateDraft,
  planProvider,
  planDiagnostics,
  writerDraft,
  onApplyDraft,
  draftProvider,
  documentDiagnostics,
}: ConverterWorkspaceProps) {
  return (
    <aside
      className="flex flex-1 min-h-0 flex-col gap-3 overflow-auto p-3.5"
      aria-label="Converter workspace"
    >
      <SourcePanel
        chapterCount={chapterCount}
        sourceText={sourceText}
        sourceType={sourceType}
        onSourceTextChange={onSourceTextChange}
      />
      <DiagnosticsBand diagnostics={sourceDiagnostics} />

      <AdaptationPreferencesPanel
        preferences={preferences}
        onPreferenceChange={onPreferenceChange}
        onGenerateOutline={onGenerateOutline}
      />

      {plan && (
        <SceneOutlinePanel
          plan={plan}
          trace={trace}
          isGeneratingWriter={isGeneratingWriter}
          hasDraft={hasDraft}
          isDraftApplied={isDraftApplied}
          onGenerateDraft={onGenerateDraft}
          generationProvider={planProvider!}
        />
      )}
      <DiagnosticsBand diagnostics={planDiagnostics} />

      {writerDraft && (
        <WriterDraftPanel
          writerDraft={writerDraft}
          isDraftApplied={isDraftApplied}
          onApplyDraft={onApplyDraft}
          generationProvider={draftProvider!}
        />
      )}
      <DiagnosticsBand diagnostics={documentDiagnostics} />
    </aside>
  );
}
