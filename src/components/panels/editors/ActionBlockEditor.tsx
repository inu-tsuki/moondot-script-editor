import { useRef, useEffect } from 'react';
import type { ActionBlock } from '../../../core/screenplay';

type ActionBlockEditorProps = {
  block: ActionBlock;
  onChange: (text: string) => void;
};

export function ActionBlockEditor({ block, onChange }: ActionBlockEditorProps) {
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
    <textarea
      ref={textareaRef}
      aria-label={`Action ${block.id}`}
      className="w-full resize-none overflow-hidden border border-transparent bg-transparent p-0 text-[15px] leading-relaxed text-[#17211d] outline-none transition-colors placeholder:text-[#b0a99d] focus:rounded-md focus:border-[#cfc7ba] focus:bg-[#fffdf8]"
      rows={1}
      value={block.text}
      onChange={(event) => onChange(event.target.value)}
      onFocus={adjustHeight}
    />
  );
}
