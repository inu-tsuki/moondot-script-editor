import { useRef, useEffect } from 'react';
import type {
  CharacterId,
  CharacterProfile,
  DialogueBlock,
  EditAction,
} from '../../../core/screenplay';

type DialogueBlockEditorProps = {
  block: DialogueBlock;
  isSelected: boolean;
  allCharacters: CharacterProfile[];
  onChange: (text: string) => void;
  onEdit: (action: EditAction) => void;
};

const ghostSelect =
  'appearance-none bg-transparent border border-transparent font-extrabold uppercase tracking-wide text-[#17211d]';
const ghostInput = 'bg-transparent border border-transparent text-[13px] italic text-[#7b776b]';
const activeControl = 'rounded border-[#cfc7ba] bg-white px-1';

export function DialogueBlockEditor({
  block,
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

  const showParenthetical = !!block.parenthetical || isSelected;

  return (
    <div className="my-3">
      <div className="mx-auto max-w-full text-center min-[860px]:max-w-[65%]">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <select
            aria-label="Character"
            className={`${ghostSelect} ${isSelected ? activeControl : ''} cursor-pointer`}
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

          {showParenthetical ? (
            <input
              aria-label="Parenthetical"
              className={`${ghostInput} ${isSelected ? activeControl : ''} outline-none`}
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
          ) : null}
        </div>

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
