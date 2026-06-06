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
        className="min-h-[280px] flex-1 resize-none rounded-md border border-[#cfc7ba] bg-[#fffaf2] p-3 leading-relaxed text-[#17211d]"
        value={sourceText}
        onChange={(event) => onSourceTextChange(event.target.value)}
      />
      <div aria-label="章节识别结果" className="grid gap-2">
        <div className="flex min-h-8 items-center justify-between rounded-md border border-[#b8d8ce] bg-[#eef6f2] px-2.5 text-xs font-bold text-[#275a50]">
          <span>sourceType</span>
          <span>{sourceType}</span>
        </div>
        <div className="flex min-h-8 items-center justify-between rounded-md border border-[#b8d8ce] bg-[#eef6f2] px-2.5 text-xs font-bold text-[#275a50]">
          <span>submission check</span>
          <span>{chapterCount >= 3 ? 'ready' : 'warning'}</span>
        </div>
      </div>
    </>
  );
}
