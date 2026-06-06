import { useRef, useEffect } from 'react';
import { Badge } from '../../ui';
import type { NarrationBlock } from '../../../core/screenplay';

type NarrationBlockEditorProps = {
  block: NarrationBlock;
  className?: string;
  onChange: (text: string) => void;
};

const voiceLabels: Record<string, string> = {
  voice_over: 'V.O.',
  off_screen: 'O.S.',
  narrator: 'NARRATOR',
};

export function NarrationBlockEditor({
  block,
  className = '',
  onChange,
}: NarrationBlockEditorProps) {
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

  const voiceLabel = block.voice ? (voiceLabels[block.voice] ?? block.voice) : undefined;

  return (
    <div className="flex items-start gap-2">
      {voiceLabel ? (
        <Badge className="mt-1 shrink-0" variant="neutral">
          {voiceLabel}
        </Badge>
      ) : null}
      <textarea
        ref={textareaRef}
        aria-label={`Narration ${block.id}`}
        className={`${className} min-w-0 flex-1 text-[15px] leading-relaxed text-[#17211d]`}
        rows={1}
        value={block.text}
        onChange={(event) => onChange(event.target.value)}
        onFocus={adjustHeight}
      />
    </div>
  );
}
