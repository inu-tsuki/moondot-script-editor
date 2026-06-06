import { AlertTriangle, ChevronDown, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button, PanelBody, PanelHeader, PanelShell, PanelTitle } from '../ui';
import { ScenePage } from './ScenePage';
import { buildDefaultBlockDraft } from '../../core/screenplay';
import type {
  BlockId,
  CharacterId,
  CharacterProfile,
  EditAction,
  SceneNode,
} from '../../core/screenplay';

type ScriptEditorPanelProps = {
  charactersById: Map<CharacterId, CharacterProfile>;
  scene: SceneNode | undefined;
  selectedBlockId: BlockId | null;
  onEdit: (action: EditAction) => void;
  onUpdateBlockText: (id: BlockId, text: string) => void;
};

const blockTypeLabels: Record<string, string> = {
  action: 'Action',
  dialogue: 'Dialogue',
  narration: 'Narration',
  transition: 'Transition',
  note: 'Note',
};

const blockTypes = ['action', 'dialogue', 'narration', 'transition', 'note'] as const;

const hasNoCharacters = (characters: CharacterProfile[]) => characters.length === 0;

export function ScriptEditorPanel({
  charactersById,
  scene,
  selectedBlockId,
  onEdit,
  onUpdateBlockText,
}: ScriptEditorPanelProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const allCharacters = [...charactersById.values()];

  const handleAppendBlock = (type: string) => {
    if (!scene) return;
    const draft = buildDefaultBlockDraft(type, allCharacters);
    if (!draft) return;
    onEdit({
      type: 'append-block',
      sceneId: scene.id,
      draft,
    });
    setMenuOpen(false);
  };

  return (
    <PanelShell>
      <PanelHeader>
        <PanelTitle icon={<Sparkles size={16} />}>Semantic Blocks</PanelTitle>
        <div className="relative">
          <Button disabled={!scene} onClick={() => setMenuOpen((prev) => !prev)} title="增加语义块">
            <Plus size={16} />
            Block
            <ChevronDown size={12} />
          </Button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-10 mt-1 flex flex-col rounded-md border border-[#cfc7ba] bg-white py-1 shadow-sm">
              {blockTypes.map((type) => {
                const disabled = type === 'dialogue' && hasNoCharacters(allCharacters);
                return (
                  <button
                    key={type}
                    className={`px-3 py-1.5 text-left text-xs leading-none ${
                      disabled
                        ? 'cursor-not-allowed text-[#b0b0b0]'
                        : 'text-[#26322d] hover:bg-[#f2ece2]'
                    }`}
                    disabled={disabled}
                    onClick={() => handleAppendBlock(type)}
                    title={disabled ? '当前 document 没有角色，无法创建 Dialogue 块' : undefined}
                    type="button"
                  >
                    {blockTypeLabels[type]}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </PanelHeader>
      <PanelBody>
        {scene ? (
          <ScenePage
            scene={scene}
            charactersById={charactersById}
            selectedBlockId={selectedBlockId}
            onEdit={onEdit}
            onUpdateBlockText={onUpdateBlockText}
          />
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-[#ebce7a] bg-[#fff6db] p-2.5 text-xs leading-relaxed text-[#5e4a15]">
            <AlertTriangle className="mt-px shrink-0" size={16} />
            <span>当前 document 没有可编辑场景。</span>
          </div>
        )}
      </PanelBody>
    </PanelShell>
  );
}
