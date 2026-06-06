import { useRef, useEffect } from 'react';
import type { NoteBlock } from '../../../core/screenplay';

type NoteBlockEditorProps = {
  block: NoteBlock;
  className?: string;
  onChange: (text: string) => void;
};

export function NoteBlockEditor({ block, className = '', onChange }: NoteBlockEditorProps) {
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
    <div className="my-2 border-l-2 border-[#cfc7ba] pl-3">
      <textarea
        ref={textareaRef}
        aria-label={`Note ${block.id}`}
        className={`${className} text-xs leading-relaxed text-[#8a8a8a] italic focus:text-[#5f6b64] focus:not-italic`}
        rows={1}
        value={block.text}
        onChange={(event) => onChange(event.target.value)}
        onFocus={adjustHeight}
      />
    </div>
  );
}
