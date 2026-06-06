import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui';
import { buildDefaultBlockDraft } from '../../core/screenplay';
import type { BlockId, CharacterProfile, EditAction, SceneId } from '../../core/screenplay';

type BlockToolbarProps = {
  blockIndex: number;
  totalBlocks: number;
  sceneId: SceneId;
  blockId: BlockId;
  characters: CharacterProfile[];
  onEdit: (action: EditAction) => void;
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

export function BlockToolbar({
  blockIndex,
  totalBlocks,
  sceneId,
  blockId,
  characters,
  onEdit,
}: BlockToolbarProps) {
  const [showInsertMenu, setShowInsertMenu] = useState(false);

  const handleInsert = (type: string) => {
    const draft = buildDefaultBlockDraft(type, characters);
    if (!draft) return;
    onEdit({
      type: 'insert-block-after',
      sceneId,
      afterBlockId: blockId,
      draft,
    });
    setShowInsertMenu(false);
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-[#e6ded2] pt-2">
      <Button
        disabled={blockIndex === 0}
        onClick={() => onEdit({ type: 'move-block', sceneId, blockId, direction: 'up' })}
        title="Move up"
        variant="ghost"
      >
        <ChevronUp size={14} />
      </Button>
      <Button
        disabled={blockIndex === totalBlocks - 1}
        onClick={() => onEdit({ type: 'move-block', sceneId, blockId, direction: 'down' })}
        title="Move down"
        variant="ghost"
      >
        <ChevronDown size={14} />
      </Button>
      <Button
        onClick={() => onEdit({ type: 'delete-block', sceneId, blockId })}
        title="Delete block"
        variant="ghost"
      >
        <Trash2 size={14} />
      </Button>

      <div className="relative">
        <Button
          onClick={() => setShowInsertMenu((prev) => !prev)}
          title="Insert block after"
          variant="ghost"
        >
          <Plus size={14} />
        </Button>
        {showInsertMenu ? (
          <div className="absolute left-0 top-full z-10 mt-1 flex flex-col rounded-md border border-[#cfc7ba] bg-white py-1 shadow-sm">
            {blockTypes.map((type) => {
              const disabled = type === 'dialogue' && hasNoCharacters(characters);
              return (
                <button
                  key={type}
                  className={`px-3 py-1.5 text-left text-xs leading-none ${
                    disabled
                      ? 'cursor-not-allowed text-[#b0b0b0]'
                      : 'text-[#26322d] hover:bg-[#f2ece2]'
                  }`}
                  disabled={disabled}
                  onClick={() => handleInsert(type)}
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
    </div>
  );
}
