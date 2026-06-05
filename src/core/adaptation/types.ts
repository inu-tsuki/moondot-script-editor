import type { ScreenplayDocument } from '../screenplay';
import type { Diagnostic } from '../validation';

export type PromptMessage = {
  role: 'system' | 'user';
  content: string;
};

export type NovelAdaptationRequest = {
  document: ScreenplayDocument;
};

export type NovelAdaptationTraceStep = {
  label: string;
  detail: string;
  sourceIds?: string[];
};

export type NovelAdaptationResult = {
  mode: 'llm_agent' | 'mock';
  document: ScreenplayDocument;
  diagnostics: Diagnostic[];
  promptMessages: PromptMessage[];
  trace: NovelAdaptationTraceStep[];
};
