type SourcePanelProps = {
  chapterCount: number;
  sourceText: string;
  sourceType: string;
  onSourceTextChange: (text: string) => void;
};

export function SourcePanel({
  chapterCount,
  sourceText,
  sourceType,
  onSourceTextChange,
}: SourcePanelProps) {
  return (
    <>
      <textarea
        aria-label="小说来源文本"
        className="min-h-[280px] flex-1 resize-none rounded-md border border-[#e4ded3] bg-white p-3 leading-relaxed text-[#17211d]"
        value={sourceText}
        onChange={(event) => onSourceTextChange(event.target.value)}
      />
      <div aria-label="章节识别结果" className="grid gap-2">
        <div className="flex min-h-8 items-center justify-between rounded-md border border-[#e4ded3] bg-[#f6f3ee] px-2.5 text-xs font-bold text-[#5f6b64]">
          <span>sourceType</span>
          <span>{sourceType}</span>
        </div>
        <div className="flex min-h-8 items-center justify-between rounded-md border border-[#e4ded3] bg-[#f6f3ee] px-2.5 text-xs font-bold text-[#5f6b64]">
          <span>submission check</span>
          <span>{chapterCount >= 3 ? 'ready' : 'warning'}</span>
        </div>
      </div>
    </>
  );
}
