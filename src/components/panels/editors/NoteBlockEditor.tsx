import { useRef, useEffect } from 'react';
import type { NoteBlock } from '../../../core/screenplay';

type NoteBlockEditorProps = {
  block: NoteBlock;
  onChange: (text: string) => void;
};

export function NoteBlockEditor({ block, onChange }: NoteBlockEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [block.text]);

  return (
    <div className="my-2 border-l-2 border-[#cfc7ba] pl-3">
      <textarea
        ref={textareaRef}
        aria-label={`Note ${block.id}`}
        className="w-full resize-none overflow-hidden border border-transparent bg-transparent p-0 text-xs leading-relaxed text-[#8a8a8a] italic outline-none transition-colors focus:rounded-md focus:border-[#cfc7ba] focus:bg-[#fffdf8] focus:px-2 focus:py-1 focus:text-[#5f6b64] focus:not-italic"
        rows={1}
        value={block.text}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
