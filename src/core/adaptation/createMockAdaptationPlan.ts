import type { NovelSource, ScreenplayDocument, SourceChapter, SourceRef } from '../screenplay';
import { resolveAdaptationPreferences } from './preferences';
import type { AdaptationPlan, AdaptationPreferences, SceneCard } from './types';

const compactText = (text: string | undefined, maxLength = 86) => {
  const normalizedText = text?.replace(/\s+/g, ' ').trim() ?? '';

  if (!normalizedText) {
    return '这一章缺少正文，后续需要由用户或模型补全可拍摄事件。';
  }

  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, maxLength)}...`;
};

const createSourceRef = (chapter: SourceChapter): SourceRef => ({
  kind: 'chapter',
  sourceId: chapter.id,
});

const groupChaptersForScenes = (chapters: SourceChapter[]) => {
  if (chapters.length <= 1) {
    return chapters.length ? [[chapters[0]]] : [];
  }

  const groups: SourceChapter[][] = [];

  for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex += 2) {
    const nextChapter = chapters[chapterIndex + 1];

    if (nextChapter) {
      groups.push([chapters[chapterIndex], nextChapter]);
      continue;
    }

    groups.push([chapters[chapterIndex - 1], chapters[chapterIndex]]);
  }

  if (chapters.length === 3) {
    return [
      [chapters[0], chapters[1]],
      [chapters[1], chapters[2]],
    ];
  }

  return groups;
};

const createSceneCard = (
  chapters: SourceChapter[],
  sceneIndex: number,
  preferences: AdaptationPreferences,
): SceneCard => {
  const sourceRefs = chapters.map(createSourceRef);
  const lastChapter = chapters[chapters.length - 1];
  const title =
    chapters.length > 1 ? `${chapters[0].title} / ${lastChapter.title}` : chapters[0].title;
  const chapterTitles = chapters.map((chapter) => `“${chapter.title}”`).join('、');
  const excerpts = chapters.map((chapter) => compactText(chapter.text)).join(' / ');

  return {
    id: `scene_card_${String(sceneIndex + 1).padStart(3, '0')}`,
    title,
    dramaticPurpose:
      chapters.length > 1
        ? `把 ${chapterTitles} 压缩成同一段可拍摄冲突，让事件因果和情绪转折同时发生。`
        : `把 ${chapterTitles} 外化为一个有明确动作目标的可拍摄场面。`,
    sourceRefs,
    pacing: preferences.pacing,
    estimatedBlocks: chapters.length > 1 ? 5 : 4,
    writerBrief: [
      `目标媒介：${preferences.targetMedium}；忠实度：${preferences.fidelity}；节奏：${preferences.pacing}。`,
      `本场使用来源：${chapterTitles}。`,
      `必须把小说信息转成动作、对白、停顿或旁白，不要直接复述摘要。`,
      `可用原文素材：${excerpts}`,
    ].join('\n'),
    headingSuggestion: {
      locationType: sceneIndex % 2 === 0 ? 'INT' : 'EXT',
      location: chapters.length > 1 ? `${chapters[0].title}交汇处` : chapters[0].title,
      timeOfDay: sceneIndex % 2 === 0 ? '夜' : '日',
    },
  };
};

export const createMockAdaptationPlan = (
  document: ScreenplayDocument,
  source: NovelSource,
  preferencesInput: Partial<AdaptationPreferences> = {},
): AdaptationPlan => {
  const preferences = resolveAdaptationPreferences(preferencesInput);
  const chapterGroups = groupChaptersForScenes(source.chapters);
  const sceneOutline = chapterGroups.map((chapters, sceneIndex) =>
    createSceneCard(chapters, sceneIndex, preferences),
  );
  const allSourceRefs = source.chapters.map(createSourceRef);
  const recommendedOptionId = preferences.allowSubplotCompression
    ? 'compress_for_conflict'
    : 'preserve_chapter_order';

  return {
    id: 'adaptation_plan_mock_001',
    preferences,
    sourceAnalysis: {
      coreEvents: source.chapters.map(
        (chapter) => `${chapter.title}：${chapter.summary ?? compactText(chapter.text)}`,
      ),
      characterArcs: document.characters.length
        ? document.characters.map(
            (character) => `${character.name} 的情绪变化需要通过行动和对白外化。`,
          )
        : ['当前没有角色表，Writer 需要先从来源中推断临时人物。'],
      timeline: source.chapters.map((chapter) => `第 ${chapter.index} 章：${chapter.title}`),
      mustKeeps: [
        '保留主要人物关系的变化。',
        '保留每个 sourceRef 对应的关键事件，不把来源追溯丢给最终 YAML。',
      ],
      compressibleParts: preferences.allowSubplotCompression
        ? ['可以压缩重复心理描写和低冲突过渡段。']
        : ['用户偏好不允许主动压缩支线，scene outline 应尽量保持章节展开。'],
      exteriorizationNotes: ['心理描写优先改成动作、视线、停顿、物件互动或角色之间的对抗。'],
    },
    characters: document.characters,
    adaptationQuestions:
      source.chapters.length >= 3
        ? [
            {
              id: 'question_001',
              question: '是否允许把相邻章节合并成同一场强冲突戏？',
              whyItMatters: '剧本场景需要围绕可拍摄冲突组织，而不是机械沿用小说章节边界。',
              sourceRefs: allSourceRefs.slice(0, 3),
              options: [
                {
                  id: 'compress_for_conflict',
                  label: '允许合并',
                  impact: '场景更紧凑，适合短剧或短片 demo。',
                },
                {
                  id: 'preserve_chapter_order',
                  label: '保持章节顺序',
                  impact: '来源更完整，但剧本节奏可能更像章节摘要。',
                },
              ],
              recommendedOptionId,
            },
          ]
        : [],
    questionAnswers:
      source.chapters.length >= 3
        ? [
            {
              questionId: 'question_001',
              optionId: recommendedOptionId,
              source: 'recommended',
            },
          ]
        : [],
    adaptationOptions: [
      {
        id: 'option_core_rewrite',
        title: '保留核心重写',
        tradeoffs: '保留人物关系和关键事件，同时允许压缩章节边界，适合当前 MVP。',
      },
      {
        id: 'option_faithful',
        title: '忠实展开',
        tradeoffs: '更接近原文顺序，但需要更多场景和更长篇幅。',
      },
    ],
    recommendedPlan:
      '采用保留核心重写：先用 scene outline 解释跨章节组合，再让 Writer 根据单场 brief 写剧本初稿。',
    sceneOutline,
    characterUpdates: document.characters.length ? [] : ['需要从来源文本中补充主要角色。'],
    risks: [
      'mock plan 只模拟架构，不代表真实模型的文学判断。',
      '当前还没有用户手动确认 scene outline，后续 UI 需要补上确认节点。',
    ],
  };
};
