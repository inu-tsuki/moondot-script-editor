import type {
  BlockId,
  CharacterId,
  NovelSource,
  SceneId,
  SceneNode,
  ScreenplayDocument,
  ScriptBlock,
  SourceRef,
} from '../screenplay';
import type { Diagnostic } from '../validation';
import {
  buildNovelAdaptationPrompt,
  buildNovelSceneWriterPrompt,
} from './buildNovelAdaptationPrompt';
import type {
  NovelAdaptationRequest,
  NovelAdaptationResult,
  NovelAdaptationTraceStep,
} from './types';

const isNovelSource = (source: ScreenplayDocument['source']): source is NovelSource =>
  source.type === 'novel';

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

const compactText = (text: string | undefined, maxLength = 70) => {
  const normalizedText = text?.replace(/\s+/g, ' ').trim() ?? '';

  if (!normalizedText) {
    return '这一章缺少正文，等待模型补全可拍摄事件。';
  }

  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, maxLength)}...`;
};

const createSceneId = (index: number): SceneId =>
  `scene_${String(index).padStart(3, '0')}` as SceneId;

const createBlockIdFactory = () => {
  let blockIndex = 1;

  return () => {
    const blockId = `blk_${String(blockIndex).padStart(3, '0')}` as BlockId;
    blockIndex += 1;

    return blockId;
  };
};

const getPrimaryCharacterId = (document: ScreenplayDocument): CharacterId | undefined =>
  document.characters[0]?.id;

const getCounterpartCharacterId = (document: ScreenplayDocument): CharacterId | undefined =>
  document.characters[1]?.id ?? document.characters[0]?.id;

const createChapterScene = (
  source: NovelSource,
  document: ScreenplayDocument,
  chapterIndex: number,
  nextBlockId: () => BlockId,
): SceneNode => {
  const chapter = source.chapters[chapterIndex];
  const sourceRefs: SourceRef[] = [{ kind: 'chapter', sourceId: chapter.id }];
  const primaryCharacterId = getPrimaryCharacterId(document);
  const counterpartCharacterId = getCounterpartCharacterId(document);
  const chapterExcerpt = compactText(chapter.text);
  const blocks: ScriptBlock[] = [
    {
      id: nextBlockId(),
      type: 'action',
      text: `${chapter.title} 的故事被压缩成一个可拍摄场面：${chapterExcerpt}`,
      sourceRefs,
    },
    {
      id: nextBlockId(),
      type: 'narration',
      voice: 'narrator',
      text: '场面围绕本章核心事件展开，人物的犹豫被外化为动作、停顿和视线交换。',
      sourceRefs,
    },
  ];

  if (primaryCharacterId) {
    blocks.push({
      id: nextBlockId(),
      type: 'dialogue',
      characterId: primaryCharacterId,
      text: `这一章的关键选择，不能只停在心里。`,
      sourceRefs,
    });
  }

  if (counterpartCharacterId && counterpartCharacterId !== primaryCharacterId) {
    blocks.push({
      id: nextBlockId(),
      type: 'dialogue',
      characterId: counterpartCharacterId,
      text: `那就把它变成我们能看见、能听见的一场戏。`,
      sourceRefs,
    });
  }

  blocks.push({
    id: nextBlockId(),
    type: 'note',
    text: '待改编修订：补充人物目标、冲突推进和更具体的场面调度。',
    sourceRefs,
  });

  return {
    id: createSceneId(chapterIndex + 1),
    title: chapter.title,
    synopsis: chapter.summary ?? `根据“${chapter.title}”生成的 mock 场景草稿。`,
    sourceRefs,
    heading: {
      locationType: chapterIndex % 2 === 0 ? 'INT' : 'EXT',
      location: chapter.title || `第 ${chapter.index} 章核心场景`,
      timeOfDay: chapterIndex % 2 === 0 ? '夜' : '日',
    },
    blocks,
  };
};

export const adaptNovelToScreenplayMock = ({
  document,
}: NovelAdaptationRequest): NovelAdaptationResult => {
  const promptMessages = [
    ...buildNovelAdaptationPrompt(document),
    ...buildNovelSceneWriterPrompt(document),
  ];

  if (!isNovelSource(document.source)) {
    return {
      mode: 'mock',
      document,
      promptMessages,
      trace: [],
      diagnostics: [
        createDiagnostic(
          'error',
          'unsupported_adaptation_source',
          '当前 mock 改编只支持 novel source。',
          'source.type',
        ),
      ],
    };
  }

  if (!document.source.chapters.length) {
    return {
      mode: 'mock',
      document,
      promptMessages,
      trace: [],
      diagnostics: [
        createDiagnostic(
          'error',
          'empty_adaptation_source',
          '没有可供改编的小说章节。',
          'source.chapters',
        ),
      ],
    };
  }

  const nextBlockId = createBlockIdFactory();
  const scenes = document.source.chapters.map((_, chapterIndex) =>
    createChapterScene(document.source as NovelSource, document, chapterIndex, nextBlockId),
  );
  const trace: NovelAdaptationTraceStep[] = [
    {
      label: 'source-ingestion',
      detail: `读取 ${document.source.chapters.length} 个小说章节作为 agent 输入。`,
      stage: 'source_analysis',
      sourceIds: document.source.chapters.map((chapter) => chapter.id),
    },
    {
      label: 'mock-planning',
      detail:
        '本地 mock 暂以章节为粗略锚点生成场景；真实流程应先生成可跨章节合并/拆分的 scene outline。',
      stage: 'adaptation_planning',
      sourceIds: document.source.chapters.map((chapter) => chapter.id),
    },
    {
      label: 'mock-writing',
      detail: '根据 mock scene outline 写入 ScreenplayAst 草稿。',
      stage: 'scene_draft',
      sourceIds: document.source.chapters.map((chapter) => chapter.id),
    },
  ];

  return {
    mode: 'mock',
    promptMessages,
    trace,
    diagnostics: [
      createDiagnostic(
        'info',
        'mock_adaptation_used',
        '当前使用本地 mock fallback；真实流程应先生成改编方案和 scene outline，再委托 Writer 写剧本初稿。',
        'adaptation',
      ),
    ],
    document: {
      ...document,
      script: {
        structure: {
          type: 'linear',
        },
        scenes,
      },
    },
  };
};
