import type { NovelSource, ScreenplayDocument } from '../screenplay';
import type { PromptMessage } from './types';

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

export const buildNovelAdaptationPrompt = (document: ScreenplayDocument): PromptMessage[] => [
  {
    role: 'system',
    content: [
      '你是“月点”的小说改编 agent，负责把长篇小说来源改编为可编辑的剧本 AST。',
      '重要边界：章节解析只负责 source ingestion；小说到剧本的转换必须由改编 agent 完成，而不是靠正则或 Fountain-like 文本解析完成。',
      '你的输出目标是 ScreenplayDocument v0.1 中的 script.scenes，不是 YAML 模板，也不是 Fountain 文本。',
      '改编时保留来源追溯，为 scene 和 block 填写 sourceRefs。',
      '优先把心理描写改写成可拍摄的动作、对白、旁白或转场，不要机械复制原文。',
    ].join('\n'),
  },
  {
    role: 'user',
    content: [
      `项目标题：${document.project.title}`,
      `目标媒介：${document.project.targetMedium}`,
      '',
      '现有角色表：',
      formatCharacterRoster(document),
      '',
      '来源章节：',
      formatChapterBriefs(document),
      '',
      '请输出 JSON object，要求：',
      '- 与 ScreenplayDocument v0.1 兼容。',
      '- 保留 documentVersion、project、source、characters。',
      '- 重写 script.scenes，使用 linear structure。',
      '- 每个 scene 至少包含 title、synopsis、heading、sourceRefs、blocks。',
      '- block 类型只能使用 action、dialogue、narration、transition、note。',
      '- dialogue 必须引用 characters 中存在的 characterId；若需要新角色，先补进 characters。',
      '- 不要输出解释文字，只输出 JSON。',
    ].join('\n'),
  },
];
