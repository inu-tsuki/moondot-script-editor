import { ListChecks, PenLine } from 'lucide-react';
import { Badge, Button, PanelMeta, PanelTitle } from '../../components/ui';
import type { AdaptationPlan, NovelAdaptationTraceStep } from '../../core/adaptation';
import type { ModelProviderType } from '../../core/model';
import { RunBadge } from './RunBadge';

type SceneOutlinePanelProps = {
  plan: AdaptationPlan | undefined;
  trace: NovelAdaptationTraceStep[];
  /** Writer call is in flight. */
  isGeneratingWriter: boolean;
  /** Writer draft already exists (generated or pending apply). */
  hasDraft: boolean;
  /** Draft has been applied to the screenplay document. */
  isDraftApplied: boolean;
  onGenerateDraft: () => void;
  /** Provider that actually generated this artifact (from trace), not the current selection. */
  generationProvider: ModelProviderType;
};

export function SceneOutlinePanel({
  plan,
  trace,
  isGeneratingWriter,
  hasDraft,
  isDraftApplied,
  onGenerateDraft,
  generationProvider,
}: SceneOutlinePanelProps) {
  if (!plan) {
    return null;
  }

  return (
    <section
      aria-label="改编大纲"
      className="grid gap-2.5 rounded-md border border-[#e4ded3] p-2.5"
    >
      <div className="flex items-center gap-2 justify-between">
        <PanelTitle icon={<ListChecks size={16} />}>Scene Outline</PanelTitle>
        <div className="flex items-center gap-2">
          <RunBadge provider={generationProvider} />
          <PanelMeta>{plan.sceneOutline.length} scenes</PanelMeta>
        </div>
      </div>

      {/* Generate Writer draft */}
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
