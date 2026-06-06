import { useRef, useEffect } from 'react';
import type {
  CharacterId,
  CharacterProfile,
  DialogueBlock,
  EditAction,
} from '../../../core/screenplay';

type DialogueBlockEditorProps = {
  block: DialogueBlock;
  characterName?: string;
  isSelected: boolean;
  allCharacters: CharacterProfile[];
  onChange: (text: string) => void;
  onEdit: (action: EditAction) => void;
};

export function DialogueBlockEditor({
  block,
  characterName,
  isSelected,
  allCharacters,
  onChange,
  onEdit,
}: DialogueBlockEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [block.text]);

  return (
    <div className="my-3">
      <div className="mx-auto max-w-full text-center min-[860px]:max-w-[65%]">
        {isSelected ? (
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
            <select
              aria-label="Character"
              className="rounded border border-[#cfc7ba] bg-white px-1.5 py-0.5 text-xs font-extrabold uppercase tracking-wide text-[#17211d]"
              onChange={(e) =>
                onEdit({
                  type: 'update-block-character',
                  blockId: block.id,
                  characterId: e.target.value as CharacterId,
                })
              }
              value={block.characterId}
            >
              {allCharacters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Parenthetical"
              className="rounded border border-[#cfc7ba] bg-white px-1.5 py-0.5 text-[13px] italic text-[#7b776b] outline-none"
              onChange={(e) =>
                onEdit({
                  type: 'update-parenthetical',
                  blockId: block.id,
                  parenthetical: e.target.value,
                })
              }
              placeholder="(parenthetical)"
              type="text"
              value={block.parenthetical ?? ''}
            />
          </div>
        ) : (
          <>
            {characterName ? (
              <div className="font-extrabold uppercase tracking-wide text-[#17211d]">
                {characterName}
              </div>
            ) : null}
            {block.parenthetical ? (
              <div className="mt-0.5 text-[13px] italic text-[#7b776b]">
                ({block.parenthetical})
              </div>
            ) : null}
          </>
        )}
        <textarea
          ref={textareaRef}
          aria-label={`Dialogue ${block.id}`}
          className="mt-0.5 w-full resize-none overflow-hidden border border-transparent bg-transparent p-0 text-center text-[14px] leading-relaxed text-[#17211d] outline-none transition-colors focus:rounded-md focus:border-[#cfc7ba] focus:bg-[#fffdf8] focus:text-left"
          rows={1}
          value={block.text}
          onChange={(event) => onChange(event.target.value)}
          onFocus={adjustHeight}
        />
      </div>
    </div>
  );
}
