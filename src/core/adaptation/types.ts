import type { ScreenplayDocument } from '../screenplay';
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
};

export type NovelAdaptationTraceStep = {
  label: string;
  detail: string;
  stage?: AdaptationWorkflowStage;
  sourceIds?: string[];
};

export type NovelAdaptationResult = {
  mode: 'llm_agent' | 'mock';
  document: ScreenplayDocument;
  diagnostics: Diagnostic[];
  promptMessages: PromptMessage[];
  trace: NovelAdaptationTraceStep[];
};
