import type { ScreenplayDocument } from '../screenplay';
import type { Diagnostic } from '../validation';
import type { AdaptationPlan, SceneBlockDraft, WriterScenePatch } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createDiagnostic = (
  severity: Diagnostic['severity'],
  code: string,
  message: string,
  path: string,
): Diagnostic => ({
  severity,
  code,
  message,
  path,
});

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

// ---------------------------------------------------------------------------
// Scene draft builder
// ---------------------------------------------------------------------------

const createSceneDraftBlocks = (
  sceneCard: AdaptationPlan['sceneOutline'][number],
  document: ScreenplayDocument,
): SceneBlockDraft[] => {
  const primaryCharacterId = document.characters[0]?.id;
  const counterpartCharacterId = document.characters[1]?.id ?? document.characters[0]?.id;
  const chapters = document.source.type === 'novel' ? document.source.chapters : [];
  const sourceExcerpts = sceneCard.sourceRefs
    .map((sourceRef) => {
      const chapter = chapters.find((ch) => ch.id === sourceRef.sourceId);
      return chapter ? `${chapter.title}：${compactText(chapter.text)}` : '';
    })
    .filter(Boolean)
    .join(' / ');

  const blocks: SceneBlockDraft[] = [
    {
      type: 'action',
      text: `开场动作描写：${sceneCard.writerBrief}`,
      sourceRefs: sceneCard.sourceRefs,
    },
  ];

  if (sourceExcerpts) {
    blocks.push({
      type: 'narration',
      voice: 'narrator',
      text: `参考原文：${sourceExcerpts}`,
      sourceRefs: sceneCard.sourceRefs,
    });
  }

  if (primaryCharacterId) {
    blocks.push({
      type: 'dialogue',
      characterId: primaryCharacterId,
      text: '（待用户根据原文和对白风格填充具体台词）',
      sourceRefs: sceneCard.sourceRefs,
    });
  }

  if (counterpartCharacterId && counterpartCharacterId !== primaryCharacterId) {
    blocks.push({
      type: 'dialogue',
      characterId: counterpartCharacterId,
      text: '（待用户根据原文和对白风格填充具体台词）',
      sourceRefs: sceneCard.sourceRefs,
    });
  }

  return blocks;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const createMockWriterScenePatch = (
  plan: AdaptationPlan,
  document: ScreenplayDocument,
): { patch: WriterScenePatch; diagnostics: Diagnostic[] } => {
  const scenes = plan.sceneOutline.map((sceneCard) => {
    // Build a scene synopsis from writerBrief and dramaticPurpose
    // without copying planning metadata verbatim — the mock Writer
    // output should read like a screenplay draft, not a repackaged
    // scene card.
    const synopsis = sceneCard.writerBrief
      ? `${sceneCard.writerBrief}（改编意图：${sceneCard.dramaticPurpose}）`
      : sceneCard.dramaticPurpose;

    return {
      sceneCardId: sceneCard.id,
      title: sceneCard.title,
      synopsis,
      heading: sceneCard.headingSuggestion,
      sourceRefs: sceneCard.sourceRefs,
      blocks: createSceneDraftBlocks(sceneCard, document),
    };
  });

  const sourceIds = plan.sceneOutline.flatMap((sceneCard) =>
    sceneCard.sourceRefs.map((sourceRef) => String(sourceRef.sourceId)),
  );

  return {
    patch: {
      planId: plan.id,
      scenes,
      characterUpdates: document.characters.length ? [] : ['需要从来源文本中补充主要角色。'],
    },
    diagnostics: [
      createDiagnostic(
        'info',
        'mock_writer_draft_used',
        `已确认改编方案，并使用本地 mock Writer 生成 ${scenes.length} 个 scene draft；引用章节：${sourceIds.join('、')}。`,
        'adaptation',
      ),
    ],
  };
};
