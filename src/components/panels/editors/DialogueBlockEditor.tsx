import { useRef, useEffect } from 'react';
import type { DialogueBlock } from '../../../core/screenplay';

type DialogueBlockEditorProps = {
  block: DialogueBlock;
  characterName?: string;
  onChange: (text: string) => void;
};

export function DialogueBlockEditor({ block, characterName, onChange }: DialogueBlockEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [block.text]);

  return (
    <div className="my-3">
      <div className="mx-auto max-w-[65%] text-center">
        {characterName ? (
          <div className="font-extrabold uppercase tracking-wide text-[#17211d]">
            {characterName}
          </div>
        ) : null}
        {block.parenthetical ? (
          <div className="mt-0.5 text-[13px] italic text-[#7b776b]">({block.parenthetical})</div>
        ) : null}
        <textarea
          ref={textareaRef}
          aria-label={`Dialogue ${block.id}`}
          className="mt-0.5 w-full resize-none overflow-hidden border border-transparent bg-transparent p-0 text-center text-[14px] leading-relaxed text-[#17211d] outline-none transition-colors focus:rounded-md focus:border-[#cfc7ba] focus:bg-[#fffdf8] focus:px-2 focus:py-1 focus:text-left"
          rows={1}
          value={block.text}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}
