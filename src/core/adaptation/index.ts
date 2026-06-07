export { applySceneDrafts } from './apply-scene-drafts';
export {
  buildNovelAdaptationPrompt,
  buildNovelSceneWriterPrompt,
} from './buildNovelAdaptationPrompt';
export { createMockAdaptationPlan } from './createMockAdaptationPlan';
export { createMockWriterScenePatch } from './createMockWriterScenePatch';
export {
  adaptNovelToScreenplayMock,
  draftNovelAdaptationFromPlanMock,
  planNovelAdaptationMock,
} from './mockNovelAdaptation';
export { adaptationPlanSchema, ADAPTATION_PLAN_SCHEMA_ID } from './adaptation-plan-schema';
export type { AdaptationPlanParsed } from './adaptation-plan-schema';
export { writerScenePatchSchema, WRITER_SCENE_PATCH_SCHEMA_ID } from './writer-scene-patch-schema';
export type { WriterScenePatchParsed } from './writer-scene-patch-schema';
export { defaultAdaptationPreferences, resolveAdaptationPreferences } from './preferences';
export { validateAdaptationPlan } from './validate-adaptation-plan';
export { validateWriterScenePatch } from './validate-writer-scene-patch';

export type {
  ValidateWriterScenePatchOptions,
  ValidateWriterScenePatchResult,
} from './validate-writer-scene-patch';
export type {
  AdaptationFidelity,
  AdaptationOption,
  AdaptationPacing,
  AdaptationPlan,
  AdaptationPreferences,
  AdaptationQuestion,
  AdaptationQuestionAnswer,
  AdaptationQuestionOption,
  AdaptationStyle,
  AdaptationTargetLength,
  AdaptationWorkflowStage,
  GenerationRun,
  GenerationTraceStep,
  NovelAdaptationDraftRequest,
  NovelAdaptationPlanRequest,
  NovelAdaptationRequest,
  NovelAdaptationResult,
  NovelAdaptationTraceStep,
  PromptMessage,
  SceneBlockDraft,
  SceneCard,
  SceneDraft,
  SourceAnalysis,
  WriterScenePatch,
} from './types';
export type {
  ValidateAdaptationPlanOptions,
  ValidateAdaptationPlanResult,
} from './validate-adaptation-plan';
// NOTE: provider-schemas are NOT re-exported from this barrel.
// Server code and tests should direct-import from
//   '.../provider-schemas/...'
// to keep provider-facing APIs out of the browser compile graph.
