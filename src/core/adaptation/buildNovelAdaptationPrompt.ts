import type { NovelSource, ScreenplayDocument } from '../screenplay';
import { resolveAdaptationPreferences } from './preferences';
import type { AdaptationPlan, AdaptationPreferences, PromptMessage } from './types';

const isNovelSource = (source: ScreenplayDocument['source']): source is NovelSource =>
  source.type === 'novel';

const compactText = (text: string | undefined, maxLength = 320) => {
  const normalizedText = text?.replace(/\s+/g, ' ').trim() ?? '';

  if (normalizedText.length <= maxLength) {
    return normalizedText || '（无正文）';
  }

  return `${normalizedText.slice(0, maxLength)}...`;
};

const formatCharacterRoster = (document: ScreenplayDocument) => {
  if (!document.characters.length) {
    return '（未提供角色表，可在输出中创建必要角色）';
  }

  return document.characters
    .map((character) => {
      const aliases = character.aliases.length ? `，别名：${character.aliases.join('、')}` : '';
      const description = character.description ? `，描述：${character.description}` : '';

      return `- ${character.id}: ${character.name}${aliases}${description}`;
    })
    .join('\n');
};

const formatChapterBriefs = (document: ScreenplayDocument) => {
  if (!isNovelSource(document.source)) {
    return '当前来源不是 novel，无法执行小说改编。';
  }

  return document.source.chapters
    .map(
      (chapter) => `- ${chapter.id} / 第 ${chapter.index} 章：${chapter.title}
  摘要：${chapter.summary ?? '（无摘要）'}
  原文摘录：${compactText(chapter.text)}`,
    )
    .join('\n');
};

const getNovelChapterCount = (document: ScreenplayDocument) =>
  isNovelSource(document.source) ? document.source.chapters.length : 0;

const getMinimumSceneCount = (document: ScreenplayDocument) => {
  const chapterCount = getNovelChapterCount(document);
  if (!chapterCount) return 1;

  return Math.max(6, chapterCount * 2);
};

const formatSceneCountGuidance = (document: ScreenplayDocument) => {
  const chapterCount = getNovelChapterCount(document);
  const minimumSceneCount = getMinimumSceneCount(document);

  return [
    '场景数量策略：',
    `- 当前识别到 ${chapterCount} 个来源章节；sceneOutline 应至少包含 ${minimumSceneCount} 个 scene cards。`,
    '- 常规小说改编需要大量复数 scenes 来覆盖情节、地点转换、行动节拍和人物关系变化；不要把多章压缩成少量剧情摘要式 scenes。',
    '- 可以让多个 scenes 引用同一章节，也可以让关键章节拆成多个 scenes；跨章节引用用于保持因果，不用于减少 scene 数量。',
  ].join('\n');
};

const formatAdaptationPreferences = (preferencesInput?: Partial<AdaptationPreferences>) => {
  const preferences = resolveAdaptationPreferences(preferencesInput);

  return [
    `- targetMedium: ${preferences.targetMedium}`,
    `- targetLength: ${preferences.targetLength}`,
    `- fidelity: ${preferences.fidelity}`,
    `- pacing: ${preferences.pacing}`,
    `- style: ${preferences.style}`,
    `- allowCharacterMerge: ${preferences.allowCharacterMerge}`,
    `- allowSubplotCompression: ${preferences.allowSubplotCompression}`,
    `- allowTimelineReorder: ${preferences.allowTimelineReorder}`,
  ].join('\n');
};

const formatPlanSceneOutline = (plan: AdaptationPlan | undefined) => {
  if (!plan) {
    return '等待输入：Adaptation Architect 产出的 sceneOutline / writerBrief。';
  }

  return plan.sceneOutline
    .map(
      (sceneCard) => `- ${sceneCard.id}: ${sceneCard.title}
  dramaticPurpose: ${sceneCard.dramaticPurpose}
  sourceRefs: ${sceneCard.sourceRefs.map((sourceRef) => sourceRef.sourceId).join(', ')}
  pacing: ${sceneCard.pacing}
  estimatedBlocks: ${sceneCard.estimatedBlocks}
  writerBrief: ${sceneCard.writerBrief}`,
    )
    .join('\n');
};

const formatSourceCoverageRule = () =>
  [
    '来源映射规则：',
    '- scene.sourceRefs 可以引用多个章节；不要默认一章等于一场戏。',
    '- 多个章节可以被合并成同一个 scene，单个章节也可以被拆成多个 scene。',
    '- 如果为了节奏删减章节内容，应在 plan 中说明删减原因。',
  ].join('\n');

export const buildNovelAdaptationPrompt = (
  document: ScreenplayDocument,
  preferences?: Partial<AdaptationPreferences>,
): PromptMessage[] => {
  const resolvedPreferences = resolveAdaptationPreferences(preferences);

  return [
    {
      role: 'system',
      stage: 'adaptation_planning',
      content: [
        '你是“月点”的 Lead Adaptation Architect，负责把小说来源分析成可执行的改编方案。',
        '重要边界：章节解析只负责 source ingestion；小说到剧本的转换必须由改编 agent 完成，而不是靠正则或 Fountain-like 文本解析完成。',
        '当前阶段不要直接写最终剧本块；先输出 source analysis、开放问题、改编选项和 scene outline。',
        formatSourceCoverageRule(),
        formatSceneCountGuidance(document),
        '优先把心理描写改写成可拍摄的动作、对白、旁白或转场，不要机械复制原文。',
      ].join('\n'),
    },
    {
      role: 'user',
      stage: 'adaptation_planning',
      content: [
        `项目标题：${document.project.title}`,
        `目标媒介：${resolvedPreferences.targetMedium}`,
        '',
        '基础改编偏好：',
        formatAdaptationPreferences(resolvedPreferences),
        '',
        '现有角色表：',
        formatCharacterRoster(document),
        '',
        '来源章节：',
        formatChapterBriefs(document),
        '',
        '请按调用层提供的 structured output schema 返回 Architect plan（JSON object）。',
        '',
        '关键创作约束：',
        '- sourceRefs[].sourceId 只能引用上方「来源章节」列表中的 chapter id。',
        '- characters 必须是本次改编可用的结构化角色表；如果现有角色表与来源不匹配，应基于来源章节重新提取主要角色，并使用稳定的 char_ 前缀 id。',
        `- sceneOutline 至少包含 ${getMinimumSceneCount(document)} 个 scene cards；优先用复数 scenes 填满所有主要情节和场景，而不是用少量 scene 概括全章。`,
        '- 如果无法为来源章节形成可执行 scene outline，不要编造计划。',
        '- 不要输出解释文字，只输出 JSON。',
      ].join('\n'),
    },
  ];
};

export const buildNovelSceneWriterPrompt = (
  document: ScreenplayDocument,
  plan?: AdaptationPlan,
): PromptMessage[] => [
  {
    role: 'system',
    stage: 'writer_brief',
    content: [
      '你是“月点”的 Lead Screenwriter，负责根据 Adaptation Architect 的 scene outline 写剧本初稿。',
      '你接收的是 writerBrief，不是整部小说的自由发挥请求。',
      '输出目标是 Writer scene patch——由 scene draft 组成的结构化产物，可通过 document operation 写入 ScreenplayDocument。',
      formatSourceCoverageRule(),
      '写作时优先使用可拍摄动作、对白、场景调度和必要旁白；避免把小说心理描写原样塞进剧本。',
    ].join('\n'),
  },
  {
    role: 'user',
    stage: 'writer_brief',
    content: [
      `项目标题：${document.project.title}`,
      `目标媒介：${document.project.targetMedium}`,
      '',
      '角色表：',
      formatCharacterRoster(document),
      '',
      '来源章节索引：',
      formatChapterBriefs(document),
      '',
      'Scene outline / writer brief：',
      `AdaptationPlan.id：${plan?.id ?? '等待输入 AdaptationPlan.id'}`,
      formatPlanSceneOutline(plan),
      '',
      '请按调用层提供的 structured output schema 返回 Writer scene patch（JSON object）。',
      '',
      '关键创作约束：',
      '- WriterScenePatch.planId 必须与上方 AdaptationPlan.id 完全一致；不要重新命名、追加版本号或根据项目标题生成新 id。',
      '- dialogue.characterId 只能使用角色表中列出的 character id；不要在 Writer 阶段创建新角色。',
      '- 每个 scene draft 的 sceneCardId 必须对应上方 scene outline 中的 scene card id。',
      '- 每个 scene draft 的 blocks 数量应接近对应 scene card 的 estimatedBlocks；默认保持短剧节奏，不要无上限扩写单场。',
      '- sourceRefs[].sourceId 只能引用上方「来源章节」列表中的 chapter id。',
      '- 如果无法根据 writer brief 生成可执行的 scene draft，不要编造场景。',
      '- 不要直接输出 YAML。',
      '- 不要输出解释文字，只输出 JSON。',
    ].join('\n'),
  },
];
