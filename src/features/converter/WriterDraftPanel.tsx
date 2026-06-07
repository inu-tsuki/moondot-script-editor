import { CheckCircle2 } from 'lucide-react';
import { Button, PanelMeta, PanelTitle } from '../../components/ui';
import type { SceneBlockDraft, WriterScenePatch } from '../../core/adaptation';
import type { ModelProviderType } from '../../core/model';
import { RunBadge } from './RunBadge';

const MAX_BLOCK_PREVIEW = 3;
const BLOCK_TEXT_LIMIT = 48;

const blockTypeLabel = (block: SceneBlockDraft): string => {
  switch (block.type) {
    case 'action':
      return '动作';
    case 'dialogue':
      return block.characterId ? `${block.characterId} 对白` : '对白';
    case 'narration':
      return block.voice ? `叙述 (${block.voice})` : '叙述';
    case 'transition':
      return '转场';
    case 'note':
      return '注释';
  }
};

const truncateText = (text: string, limit: number): string =>
  text.length <= limit ? text : `${text.slice(0, limit)}…`;

const formatHeading = (heading: {
  locationType: string;
  location: string;
  timeOfDay: string;
}): string => `${heading.locationType}. ${heading.location} — ${heading.timeOfDay}`;

type WriterDraftPanelProps = {
  writerDraft: WriterScenePatch | null;
  isDraftApplied: boolean;
  onApplyDraft: () => void;
  providerType: ModelProviderType;
};

export function WriterDraftPanel({
  writerDraft,
  isDraftApplied,
  onApplyDraft,
  providerType,
}: WriterDraftPanelProps) {
  if (!writerDraft) return null;

  const sceneCount = writerDraft.scenes.length;

  return (
    <section
      aria-label="Writer 草稿"
      className="grid gap-2.5 rounded-md border border-[#e4ded3] p-2.5"
    >
      <div className="flex items-center gap-2 justify-between">
        <PanelTitle icon={<CheckCircle2 size={16} />}>Writer Draft</PanelTitle>
        <div className="flex items-center gap-2">
          <RunBadge provider={providerType} />
          <PanelMeta>{sceneCount} drafts</PanelMeta>
        </div>
      </div>

      {/* Apply action */}
      {isDraftApplied ? (
        <div className="flex justify-end">
          <Button title="Writer 草稿已应用到剧本" variant="secondary" disabled>
            <CheckCircle2 size={16} />
            已应用到剧本
          </Button>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button title="将 Writer 草稿应用到当前剧本" variant="primary" onClick={onApplyDraft}>
            <CheckCircle2 size={16} />
            应用到剧本
          </Button>
        </div>
      )}

      {/* Draft preview */}
      <div
        aria-label="Writer 草稿预览"
        className="grid gap-1.5 rounded-md border border-[#b8d8ce] bg-[#e6f3ee] p-2"
      >
        <span className="text-[11px] font-extrabold text-[#2f665c]">
          Writer 草稿 — {sceneCount} 个 scene draft 已通过 validation
        </span>
        <div className="grid gap-2">
          {writerDraft.scenes.map((draft) => {
            const blockPreviews = draft.blocks.slice(0, MAX_BLOCK_PREVIEW);
            const moreBlockCount = draft.blocks.length - blockPreviews.length;
            return (
              <div
                key={draft.sceneCardId}
                className="grid gap-1 rounded border border-[#b3d6c9] bg-white p-1.5 text-[11px] leading-relaxed"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-extrabold text-[#17211d]">{draft.title}</span>
                  <span className="text-[#5f6b64]">({draft.sceneCardId})</span>
                </div>
                <span className="text-[#53635b]">{formatHeading(draft.heading)}</span>

                {draft.synopsis && (
                  <span className="italic text-[#53635b]">{truncateText(draft.synopsis, 100)}</span>
                )}

                {draft.sourceRefs.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {draft.sourceRefs.map((ref) => (
                      <span
                        key={`${ref.sourceId}-${ref.kind}`}
                        className="inline-block rounded-sm bg-[#e6f3ee] px-1 text-[10px] font-extrabold text-[#2f665c]"
                      >
                        {String(ref.sourceId)}
                      </span>
                    ))}
                  </div>
                )}

                {blockPreviews.length > 0 && (
                  <div className="grid gap-[3px] border-t border-[#e0ece4] pt-1">
                    {blockPreviews.map((block, index) => (
                      <div
                        key={`${draft.sceneCardId}-block-${index}`}
                        className="flex items-start gap-1.5"
                      >
                        <span className="shrink-0 rounded-sm bg-[#dce9e3] px-[3px] text-[10px] font-extrabold text-[#3d5a50]">
                          {blockTypeLabel(block)}
                        </span>
                        <span className="text-[#53635b]">
                          {truncateText(block.text, BLOCK_TEXT_LIMIT)}
                        </span>
                      </div>
                    ))}
                    {moreBlockCount > 0 && (
                      <span className="text-[10px] text-[#66716b]">
                        …还有 {moreBlockCount} 个 block
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
