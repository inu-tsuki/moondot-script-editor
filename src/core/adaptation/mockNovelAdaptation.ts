import { createBlockIdFactory } from '../screenplay';
import type {
  BlockId,
  CharacterId,
  NovelSource,
  SceneId,
  SceneNode,
  ScreenplayDocument,
  ScriptBlock,
} from '../screenplay';
import type { Diagnostic } from '../validation';
import {
  buildNovelAdaptationPrompt,
  buildNovelSceneWriterPrompt,
} from './buildNovelAdaptationPrompt';
import { createMockAdaptationPlan } from './createMockAdaptationPlan';
import { resolveAdaptationPreferences } from './preferences';
import type {
  NovelAdaptationDraftRequest,
  NovelAdaptationPlanRequest,
  NovelAdaptationRequest,
  NovelAdaptationResult,
  NovelAdaptationTraceStep,
  SceneCard,
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

const createSceneId = (index: number): SceneId =>
  `scene_${String(index).padStart(3, '0')}` as SceneId;

const getPrimaryCharacterId = (document: ScreenplayDocument): CharacterId | undefined =>
  document.characters[0]?.id;

const getCounterpartCharacterId = (document: ScreenplayDocument): CharacterId | undefined =>
  document.characters[1]?.id ?? document.characters[0]?.id;

const createSceneFromCard = (
  sceneCard: SceneCard,
  document: ScreenplayDocument,
  sceneIndex: number,
  nextBlockId: () => BlockId,
): SceneNode => {
  const primaryCharacterId = getPrimaryCharacterId(document);
  const counterpartCharacterId = getCounterpartCharacterId(document);
  const sourceRefText = sceneCard.sourceRefs.map((sourceRef) => sourceRef.sourceId).join('、');
  const blocks: ScriptBlock[] = [
    {
      id: nextBlockId(),
      type: 'action',
      text: `【${sceneCard.id}】${sceneCard.dramaticPurpose}`,
      sourceRefs: sceneCard.sourceRefs,
    },
    {
      id: nextBlockId(),
      type: 'narration',
      voice: 'narrator',
      text: `Writer brief：${sceneCard.writerBrief}`,
      sourceRefs: sceneCard.sourceRefs,
    },
  ];

  if (primaryCharacterId) {
    blocks.push({
      id: nextBlockId(),
      type: 'dialogue',
      characterId: primaryCharacterId,
      text: `这不是复述 ${sourceRefText}，我们得把它变成能看见的选择。`,
      sourceRefs: sceneCard.sourceRefs,
    });
  }

  if (counterpartCharacterId && counterpartCharacterId !== primaryCharacterId) {
    blocks.push({
      id: nextBlockId(),
      type: 'dialogue',
      characterId: counterpartCharacterId,
      text: `那就把冲突放到台面上，让这一场真的往前走。`,
      sourceRefs: sceneCard.sourceRefs,
    });
  }

  blocks.push({
    id: nextBlockId(),
    type: 'note',
    text: `待确认：${sceneCard.title} 仍是 mock scene card，后续应允许用户在 outline 阶段调整。`,
    sourceRefs: sceneCard.sourceRefs,
  });

  return {
    id: createSceneId(sceneIndex + 1),
    title: sceneCard.title,
    synopsis: sceneCard.dramaticPurpose,
    sourceRefs: sceneCard.sourceRefs,
    heading: sceneCard.headingSuggestion,
    blocks,
  };
};

export const planNovelAdaptationMock = ({
  document,
  preferences: preferencesInput,
}: NovelAdaptationPlanRequest): NovelAdaptationResult => {
  const preferences = resolveAdaptationPreferences(preferencesInput);
  const promptMessages = buildNovelAdaptationPrompt(document, preferences);

  if (!isNovelSource(document.source)) {
    const trace: NovelAdaptationTraceStep[] = [];

    return {
      mode: 'mock',
      document,
      promptMessages,
      trace,
      generationRun: {
        mode: 'mock',
        steps: trace,
      },
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
    const trace: NovelAdaptationTraceStep[] = [];

    return {
      mode: 'mock',
      document,
      promptMessages,
      trace,
      generationRun: {
        mode: 'mock',
        steps: trace,
      },
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

  const plan = createMockAdaptationPlan(document, document.source, preferences);
  const planSourceIds = plan.sceneOutline.flatMap((sceneCard) =>
    sceneCard.sourceRefs.map((sourceRef) => String(sourceRef.sourceId)),
  );
  const trace: NovelAdaptationTraceStep[] = [
    {
      label: 'source-ingestion',
      detail: `读取 ${document.source.chapters.length} 个小说章节作为 agent 输入。`,
      stage: 'source_analysis',
      artifactType: 'source_analysis',
      sourceIds: document.source.chapters.map((chapter) => chapter.id),
    },
    {
      label: 'mock-planning',
      detail: `生成 ${plan.sceneOutline.length} 张 scene cards；scene 可以引用多个章节，不再把章节机械映射为场景。`,
      stage: 'adaptation_planning',
      artifactType: 'adaptation_plan',
      sourceIds: planSourceIds,
    },
  ];

  return {
    mode: 'mock',
    document,
    promptMessages,
    plan,
    trace,
    generationRun: {
      mode: 'mock',
      planId: plan.id,
      steps: trace,
    },
    diagnostics: [
      createDiagnostic(
        'info',
        'mock_adaptation_plan_used',
        '当前使用本地 mock 生成改编方案；请确认 scene outline 后再委托 Writer 写剧本初稿。',
        'adaptation',
      ),
    ],
  };
};

export const draftNovelAdaptationFromPlanMock = ({
  document,
  plan,
}: NovelAdaptationDraftRequest): NovelAdaptationResult => {
  const promptMessages = buildNovelSceneWriterPrompt(document, plan);
  const nextBlockId = createBlockIdFactory(document);
  const scenes = plan.sceneOutline.map((sceneCard, sceneIndex) =>
    createSceneFromCard(sceneCard, document, sceneIndex, nextBlockId),
  );
  const sourceIds = plan.sceneOutline.flatMap((sceneCard) =>
    sceneCard.sourceRefs.map((sourceRef) => String(sourceRef.sourceId)),
  );
  const trace: NovelAdaptationTraceStep[] = [
    {
      label: 'mock-writing',
      detail:
        '用户确认 scene outline 后，根据 mock SceneCard.writerBrief 写入 ScreenplayAst 草稿。',
      stage: 'scene_draft',
      artifactType: 'writer_draft',
      sourceIds,
    },
  ];

  return {
    mode: 'mock',
    promptMessages,
    plan,
    trace,
    generationRun: {
      mode: 'mock',
      planId: plan.id,
      steps: trace,
    },
    diagnostics: [
      createDiagnostic(
        'info',
        'mock_writer_draft_used',
        '已确认改编方案，并使用本地 mock Writer 写入剧本初稿。',
        'adaptation',
      ),
    ],
    document: {
      ...document,
      project: {
        ...document.project,
        targetMedium: plan.preferences.targetMedium,
      },
      script: {
        structure: {
          type: 'linear',
        },
        scenes,
      },
    },
  };
};

export const adaptNovelToScreenplayMock = (
  request: NovelAdaptationRequest,
): NovelAdaptationResult => {
  const planResult = planNovelAdaptationMock(request);

  if (!planResult.plan) {
    return planResult;
  }

  const draftResult = draftNovelAdaptationFromPlanMock({
    document: request.document,
    plan: planResult.plan,
  });

  return {
    ...draftResult,
    diagnostics: [...planResult.diagnostics, ...draftResult.diagnostics],
    promptMessages: [...planResult.promptMessages, ...draftResult.promptMessages],
    trace: [...planResult.trace, ...draftResult.trace],
    generationRun: {
      ...draftResult.generationRun,
      steps: [...planResult.trace, ...draftResult.trace],
    },
  };
};
