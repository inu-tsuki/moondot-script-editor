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
  manuscriptField?: string;
  manuscriptText?: string;
  onChange: (text: string) => void;
  onEdit: (action: EditAction) => void;
};

export function DialogueBlockEditor({
  block,
  isSelected,
  allCharacters,
  manuscriptField = '',
  manuscriptText = '',
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

  const selectClass = isSelected
    ? 'rounded border-[#cfc7ba] bg-white px-1'
    : 'border-transparent bg-transparent';

  const inputClass = isSelected
    ? 'rounded border-[#cfc7ba] bg-white px-1'
    : 'border-transparent bg-transparent';

  return (
    <div className="my-3">
      <div className="mx-auto max-w-full text-center min-[860px]:max-w-[65%]">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <select
            aria-label="Character"
            className={`${manuscriptField} appearance-none cursor-pointer font-extrabold uppercase tracking-wide text-[#17211d] ${selectClass}`}
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
              className={`${manuscriptField} text-[13px] italic text-[#7b776b] outline-none ${inputClass}`}
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
          className={`${manuscriptText} mt-0.5 text-center text-[14px] leading-relaxed text-[#17211d] focus:text-left`}
          rows={1}
          value={block.text}
          onChange={(event) => onChange(event.target.value)}
          onFocus={adjustHeight}
        />
      </div>
    </div>
  );
}
