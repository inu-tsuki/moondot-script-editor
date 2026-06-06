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
        '- sceneOutline 至少包含 1 个 scene card；鼓励跨章节合并（1 个 scene 引用多个章节）。',
        '- 如果不能形成可执行 scene outline，返回 schema 内允许的最小有效 plan。',
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
      '输出目标是 ScreenplayDocument v0.1 中的 script.scenes，可被编辑器继续修改。',
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
      formatPlanSceneOutline(plan),
      '收到后请输出 JSON object，要求：',
      '- 与 ScreenplayDocument v0.1 兼容。',
      '- 保留 documentVersion、project、source、characters。',
      '- 只重写被委托的 script.scenes 或 scene 片段。',
      '- 每个 scene 至少包含 title、synopsis、heading、sourceRefs、blocks。',
      '- block 类型只能使用 action、dialogue、narration、transition、note。',
      '- dialogue 必须引用 characters 中存在的 characterId；若需要新角色，先请求角色补充或在 characterUpdates 中说明。',
      '- 不要输出解释文字，只输出 JSON。',
    ].join('\n'),
  },
];
