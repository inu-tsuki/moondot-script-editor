import { CheckCircle2, ListChecks, PenLine } from 'lucide-react';
import { Badge, Button, PanelMeta, PanelTitle } from '../ui';
import type {
  AdaptationPlan,
  NovelAdaptationTraceStep,
  WriterScenePatch,
} from '../../core/adaptation';

type SceneOutlinePanelProps = {
  plan: AdaptationPlan | undefined;
  trace: NovelAdaptationTraceStep[];
  /** Pending Writer draft (validated, not yet applied). */
  writerDraft: WriterScenePatch | null;
  /** Writer call is in flight. */
  isGeneratingWriter: boolean;
  /** Draft has been applied to the screenplay document. */
  isDraftApplied: boolean;
  onGenerateDraft: () => void;
  onApplyDraft: () => void;
};

export function SceneOutlinePanel({
  plan,
  trace,
  writerDraft,
  isGeneratingWriter,
  isDraftApplied,
  onGenerateDraft,
  onApplyDraft,
}: SceneOutlinePanelProps) {
  if (!plan) {
    return null;
  }

  const hasDraft = writerDraft !== null;
  const sceneCount = writerDraft?.scenes.length ?? plan.sceneOutline.length;

  return (
    <section
      aria-label="改编大纲"
      className="grid gap-2.5 rounded-md border border-[#e4ded3] p-2.5"
    >
      <div className="flex items-center gap-2 justify-between">
        <PanelTitle icon={<ListChecks size={16} />}>Scene Outline</PanelTitle>
        <PanelMeta>{plan.sceneOutline.length} scenes</PanelMeta>
      </div>

      {/* Phase 1: Generate Writer draft */}
      {!isDraftApplied && (
        <div className="flex justify-end gap-2">
          <Button
            title="确认大纲并生成剧本草稿"
            variant={hasDraft ? undefined : 'primary'}
            onClick={onGenerateDraft}
            disabled={isGeneratingWriter || isDraftApplied}
          >
            <PenLine size={16} />
            {isGeneratingWriter ? '生成中...' : hasDraft ? '重新生成' : '确认生成'}
          </Button>
          {/* Phase 2: Apply draft to document */}
          {hasDraft && (
            <Button
              title="将 Writer 草稿应用到当前剧本"
              variant="primary"
              onClick={onApplyDraft}
              disabled={isDraftApplied}
            >
              <CheckCircle2 size={16} />
              应用到剧本
            </Button>
          )}
        </div>
      )}
      {isDraftApplied && (
        <div className="flex justify-end">
          <Button title="Writer 草稿已应用到剧本" variant="secondary" disabled>
            <CheckCircle2 size={16} />
            已应用到剧本
          </Button>
        </div>
      )}

      {/* Writer draft preview */}
      {hasDraft && !isDraftApplied && (
        <div
          aria-label="Writer 草稿预览"
          className="grid gap-1.5 rounded-md border border-[#b8d8ce] bg-[#e6f3ee] p-2"
        >
          <span className="text-[11px] font-extrabold text-[#2f665c]">
            Writer 草稿 — {sceneCount} 个 scene draft 已通过 validation
          </span>
          <div className="grid gap-1">
            {writerDraft!.scenes.map((draft) => (
              <div
                key={draft.sceneCardId}
                className="flex items-center gap-2 text-[11px] leading-relaxed text-[#3d5a50]"
              >
                <span className="font-extrabold">{draft.sceneCardId}</span>
                <span>{draft.title}</span>
                <span className="text-[#66716b]">({draft.blocks.length} blocks)</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="accent">{plan.preferences.targetMedium}</Badge>
        <Badge variant="accent">{plan.preferences.targetLength}</Badge>
        <Badge variant="accent">{plan.preferences.fidelity}</Badge>
        <Badge variant="accent">{plan.preferences.pacing}</Badge>
      </div>
      <div className="grid gap-2">
        {plan.sceneOutline.map((sceneCard) => (
          <article
            className="grid gap-1.5 rounded-md border border-[#e4ded3] bg-white p-2"
            key={sceneCard.id}
          >
            <div className="text-[13px] font-extrabold text-[#17211d]">{sceneCard.title}</div>
            <div className="text-xs leading-relaxed text-[#53635b]">
              {sceneCard.dramaticPurpose}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-extrabold text-[#5f6b64]">
              <span>{sceneCard.id}</span>
              <span>{sceneCard.sourceRefs.map((sourceRef) => sourceRef.sourceId).join(' + ')}</span>
            </div>
          </article>
        ))}
      </div>
      {trace.length ? (
        <div aria-label="生成轨迹" className="grid gap-1.5 border-t border-[#e4ded3] pt-2">
          {trace.map((traceStep) => (
            <div
              className="grid gap-[3px] text-[11px] leading-relaxed text-[#53635b]"
              key={`${traceStep.label}-${traceStep.stage}`}
            >
              <span className="font-extrabold text-[#5f6b64]">{traceStep.label}</span>
              <span>{traceStep.detail}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
