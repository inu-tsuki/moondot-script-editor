import { AlertTriangle, Plus, Sparkles } from 'lucide-react';
import { Badge, Button, PanelBody, PanelHeader, PanelMeta, PanelShell, PanelTitle } from '../ui';
import { formatSceneHeading, getBlockCharacterId } from '../../core/screenplay';
import type {
  BlockId,
  CharacterId,
  CharacterProfile,
  SceneNode,
  ScriptBlock,
} from '../../core/screenplay';

type ScriptEditorPanelProps = {
  charactersById: Map<CharacterId, CharacterProfile>;
  scene: SceneNode | undefined;
  onAddBlock: () => void;
  onUpdateBlockText: (id: BlockId, text: string) => void;
};

const blockTypeLabels: Record<ScriptBlock['type'], string> = {
  action: 'ACTION',
  dialogue: 'DIALOGUE',
  narration: 'NARRATION',
  transition: 'TRANSITION',
  note: 'NOTE',
};

export function ScriptEditorPanel({
  charactersById,
  scene,
  onAddBlock,
  onUpdateBlockText,
}: ScriptEditorPanelProps) {
  return (
    <PanelShell>
      <PanelHeader>
        <PanelTitle icon={<Sparkles size={16} />}>Semantic Blocks</PanelTitle>
        <Button title="增加语义块" onClick={onAddBlock}>
          <Plus size={16} />
          Block
        </Button>
      </PanelHeader>
      <PanelBody>
        <div className="grid gap-3">
          {scene ? (
            <article className="overflow-hidden rounded-lg border border-[#d9d1c4] bg-[#fffaf2]">
              <div className="grid grid-cols-[1fr_auto] items-start gap-2 border-b border-[#e4d9c9] p-3">
                <div>
                  <div className="text-[11px] font-extrabold uppercase text-[#7b6651]">
                    {formatSceneHeading(scene.heading)}
                  </div>
                  <div className="mt-1 text-base font-extrabold">{scene.title}</div>
                  <div className="mt-1.5 text-[13px] leading-relaxed text-[#56615a]">
                    {scene.synopsis}
                  </div>
                </div>
                <PanelMeta>{scene.id}</PanelMeta>
              </div>
              <div className="grid gap-2.5 p-3">
                {scene.blocks.map((block) => {
                  const characterId = getBlockCharacterId(block);
                  const characterName = characterId
                    ? (charactersById.get(characterId)?.name ?? characterId)
                    : undefined;

                  return (
                    <div
                      className="grid gap-2 rounded-md border border-[#ded8cf] bg-white p-2.5"
                      key={block.id}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="dark">{blockTypeLabels[block.type]}</Badge>
                        {characterName ? (
                          <Badge className="border-transparent bg-transparent text-[#8a4b2d]">
                            {characterName}
                          </Badge>
                        ) : null}
                      </div>
                      <textarea
                        aria-label={`${blockTypeLabels[block.type]} ${block.id}`}
                        className="min-h-[72px] resize-y rounded-md border border-[#d3cabd] bg-[#fffdf8] p-2.5 leading-relaxed"
                        value={block.text}
                        onChange={(event) => onUpdateBlockText(block.id, event.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
            </article>
          ) : (
            <div className="flex items-start gap-2 rounded-md border border-[#ebce7a] bg-[#fff6db] p-2.5 text-xs leading-relaxed text-[#5e4a15]">
              <AlertTriangle className="mt-px shrink-0" size={16} />
              <span>当前 document 没有可编辑场景。</span>
            </div>
          )}
        </div>
      </PanelBody>
    </PanelShell>
  );
}
