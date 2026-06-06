import { useRef, useEffect } from 'react';
import type { ActionBlock } from '../../../core/screenplay';

type ActionBlockEditorProps = {
  block: ActionBlock;
  className?: string;
  onChange: (text: string) => void;
};

export function ActionBlockEditor({ block, className = '', onChange }: ActionBlockEditorProps) {
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
      className={`${className} text-[15px] leading-relaxed text-[#17211d]`}
      rows={1}
      value={block.text}
      onChange={(event) => onChange(event.target.value)}
      onFocus={adjustHeight}
    />
  );
}
