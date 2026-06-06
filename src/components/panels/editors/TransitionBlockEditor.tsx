import { useRef, useEffect } from 'react';
import type { TransitionBlock } from '../../../core/screenplay';

type TransitionBlockEditorProps = {
  block: TransitionBlock;
  className?: string;
  onChange: (text: string) => void;
};

export function TransitionBlockEditor({
  block,
  className = '',
  onChange,
}: TransitionBlockEditorProps) {
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
    <div className="flex justify-end">
      <textarea
        ref={textareaRef}
        aria-label={`Transition ${block.id}`}
        className={`${className} text-right text-[13px] font-extrabold uppercase tracking-wide text-[#5f6b64]`}
        rows={1}
        value={block.text}
        onChange={(event) => onChange(event.target.value)}
        onFocus={adjustHeight}
      />
    </div>
  );
}
