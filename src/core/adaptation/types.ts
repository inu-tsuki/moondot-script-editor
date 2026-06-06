import type { SceneHeading, ScreenplayDocument, SourceRef, TargetMedium } from '../screenplay';
import type { Diagnostic } from '../validation';

export type AdaptationWorkflowStage =
  | 'source_analysis'
  | 'adaptation_planning'
  | 'writer_brief'
  | 'scene_draft'
  | 'validation';

export type PromptMessage = {
  role: 'system' | 'user';
  content: string;
  stage?: AdaptationWorkflowStage;
};

export type NovelAdaptationRequest = {
  document: ScreenplayDocument;
  preferences?: Partial<AdaptationPreferences>;
};

export type AdaptationTargetLength =
  | 'short_scene'
  | 'short_drama_3_min'
  | 'ten_scene_outline'
  | 'episode_outline';

export type AdaptationFidelity = 'faithful' | 'core_rewrite' | 'free';

export type AdaptationPacing = 'slow' | 'balanced' | 'fast';

export type AdaptationStyle = 'realist' | 'suspense' | 'light_comedy' | 'cold' | 'romantic';

export type AdaptationPreferences = {
  targetMedium: TargetMedium;
  targetLength: AdaptationTargetLength;
  fidelity: AdaptationFidelity;
  pacing: AdaptationPacing;
  style: AdaptationStyle;
  allowCharacterMerge: boolean;
  allowSubplotCompression: boolean;
  allowTimelineReorder: boolean;
  source: 'system_default' | 'user';
};

export type SourceAnalysis = {
  coreEvents: string[];
  characterArcs: string[];
  timeline: string[];
  mustKeeps: string[];
  compressibleParts: string[];
  exteriorizationNotes: string[];
};

export type AdaptationQuestionOption = {
  id: string;
  label: string;
  impact: string;
};

export type AdaptationQuestion = {
  id: string;
  question: string;
  whyItMatters: string;
  sourceRefs: SourceRef[];
  options: AdaptationQuestionOption[];
  recommendedOptionId: string;
};

export type AdaptationQuestionAnswer = {
  questionId: string;
  optionId: string;
  source: 'recommended' | 'user';
};

export type AdaptationOption = {
  id: string;
  title: string;
  tradeoffs: string;
};

export type SceneCard = {
  id: string;
  title: string;
  dramaticPurpose: string;
  sourceRefs: SourceRef[];
  pacing: AdaptationPacing;
  estimatedBlocks: number;
  writerBrief: string;
  headingSuggestion: SceneHeading;
};

export type AdaptationPlan = {
  id: string;
  preferences: AdaptationPreferences;
  sourceAnalysis: SourceAnalysis;
  adaptationQuestions: AdaptationQuestion[];
  questionAnswers: AdaptationQuestionAnswer[];
  adaptationOptions: AdaptationOption[];
  recommendedPlan: string;
  sceneOutline: SceneCard[];
  characterUpdates: string[];
  risks: string[];
};

export type GenerationTraceStep = {
  label: string;
  detail: string;
  stage?: AdaptationWorkflowStage;
  sourceIds?: string[];
  artifactType?: 'preferences' | 'source_analysis' | 'adaptation_plan' | 'writer_draft';
};

export type GenerationRun = {
  mode: 'llm_agent' | 'mock';
  planId?: string;
  steps: GenerationTraceStep[];
};

export type NovelAdaptationTraceStep = GenerationTraceStep;

export type NovelAdaptationResult = {
  mode: 'llm_agent' | 'mock';
  document: ScreenplayDocument;
  plan?: AdaptationPlan;
  diagnostics: Diagnostic[];
  promptMessages: PromptMessage[];
  trace: NovelAdaptationTraceStep[];
  generationRun: GenerationRun;
};
