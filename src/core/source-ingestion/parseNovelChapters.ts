import type { Diagnostic } from '../validation';
import type { ChapterId, SourceChapter } from '../screenplay';

export type ChapterParseResult = {
  chapters: SourceChapter[];
  diagnostics: Diagnostic[];
};

type HeadingMatch = {
  lineIndex: number;
  title: string;
};

const chapterHeadingPattern =
  /^\s*((第[零〇一二三四五六七八九十百千万两\d]{1,9}[章节回幕卷])|(Chapter\s+\d+))[\s:：、.-]*(.*)$/i;

const createChapterId = (index: number): ChapterId =>
  `ch_${String(index).padStart(3, '0')}` as ChapterId;

const normalizeText = (text: string) => text.replace(/\r\n?/g, '\n').trim();

const createDiagnostic = (
  severity: Diagnostic['severity'],
  code: string,
  message: string,
  path: string,
  suggestion?: string,
): Diagnostic => ({
  severity,
  code,
  message,
  path,
  suggestion,
});

const getHeadingTitle = (line: string) => {
  const match = line.match(chapterHeadingPattern);

  if (!match) {
    return undefined;
  }

  const marker = match[1]?.trim();
  const title = match[4]?.trim();

  return title || marker || line.trim();
};

const collectHeadings = (lines: string[]) =>
  lines.reduce<HeadingMatch[]>((headings, line, lineIndex) => {
    const title = getHeadingTitle(line);

    if (!title) {
      return headings;
    }

    headings.push({ lineIndex, title });

    return headings;
  }, []);

const getChapterBody = (lines: string[], heading: HeadingMatch, nextHeading?: HeadingMatch) =>
  lines
    .slice(heading.lineIndex + 1, nextHeading?.lineIndex)
    .join('\n')
    .trim();

export const parseNovelChapters = (text: string): ChapterParseResult => {
  const normalizedText = normalizeText(text);

  if (!normalizedText) {
    return {
      chapters: [],
      diagnostics: [
        createDiagnostic('error', 'empty_source_text', '小说文本不能为空。', 'sourceText'),
      ],
    };
  }

  const lines = normalizedText.split('\n');
  const headings = collectHeadings(lines);

  if (!headings.length) {
    return {
      chapters: [
        {
          id: createChapterId(1),
          index: 1,
          title: '全文',
          text: normalizedText,
        },
      ],
      diagnostics: [
        createDiagnostic(
          'warning',
          'chapter_heading_not_found',
          '未识别到明确章节标题，已按单章处理。',
          'sourceText',
          '可使用“第一章”或“Chapter 1”这类标题帮助工具分章。',
        ),
      ],
    };
  }

  const chapters = headings.map<SourceChapter>((heading, headingIndex) => {
    const text = getChapterBody(lines, heading, headings[headingIndex + 1]);

    return {
      id: createChapterId(headingIndex + 1),
      index: headingIndex + 1,
      title: heading.title,
      text,
    };
  });

  const diagnostics = chapters
    .filter((chapter) => !chapter.text?.trim())
    .map((chapter) =>
      createDiagnostic(
        'warning',
        'empty_parsed_chapter_text',
        `章节“${chapter.title}”没有正文。`,
        `source.chapters[${chapter.index - 1}].text`,
      ),
    );

  return {
    chapters,
    diagnostics,
  };
};
