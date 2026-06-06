import { CheckCircle2, ListChecks } from 'lucide-react';
import { Badge, Button, PanelMeta, PanelTitle } from '../ui';
import type { AdaptationPlan, NovelAdaptationTraceStep } from '../../core/adaptation';

type SceneOutlinePanelProps = {
  isDrafted: boolean;
  plan: AdaptationPlan | undefined;
  trace: NovelAdaptationTraceStep[];
  onConfirm: () => void;
};

export function SceneOutlinePanel({ isDrafted, plan, trace, onConfirm }: SceneOutlinePanelProps) {
  if (!plan) {
    return null;
  }

  return (
    <section
      aria-label="改编大纲"
      className="grid gap-2.5 rounded-md border border-[#b8d8ce] bg-[#f4fbf7] p-2.5"
    >
      <div className="flex items-center gap-2 justify-between">
        <PanelTitle icon={<ListChecks size={16} />}>Scene Outline</PanelTitle>
        <PanelMeta>{plan.sceneOutline.length} scenes</PanelMeta>
      </div>
      <div className="flex justify-end">
        <Button
          title="确认大纲并写入剧本"
          variant="primary"
          onClick={onConfirm}
          disabled={isDrafted}
        >
          <CheckCircle2 size={16} />
          {isDrafted ? '已写入' : '确认写入'}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="accent">{plan.preferences.targetMedium}</Badge>
        <Badge variant="accent">{plan.preferences.targetLength}</Badge>
        <Badge variant="accent">{plan.preferences.fidelity}</Badge>
        <Badge variant="accent">{plan.preferences.pacing}</Badge>
      </div>
      <div className="grid gap-2 max-h-[220px] overflow-auto">
        {plan.sceneOutline.map((sceneCard) => (
          <article
            className="grid gap-1.5 rounded-md border border-[#cfe5dd] bg-white p-2"
            key={sceneCard.id}
          >
            <div className="text-[13px] font-extrabold text-[#17211d]">{sceneCard.title}</div>
            <div className="text-xs leading-relaxed text-[#53635b]">
              {sceneCard.dramaticPurpose}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-extrabold text-[#2f665c]">
              <span>{sceneCard.id}</span>
              <span>{sceneCard.sourceRefs.map((sourceRef) => sourceRef.sourceId).join(' + ')}</span>
            </div>
          </article>
        ))}
      </div>
      {trace.length ? (
        <div aria-label="生成轨迹" className="grid gap-1.5 border-t border-[#cfe5dd] pt-2">
          {trace.map((traceStep) => (
            <div
              className="grid gap-[3px] text-[11px] leading-relaxed text-[#53635b]"
              key={`${traceStep.label}-${traceStep.stage}`}
            >
              <span className="font-extrabold text-[#2f665c]">{traceStep.label}</span>
              <span>{traceStep.detail}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
