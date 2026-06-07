import type { AdaptationPlan, AdaptationPreferences, NovelAdaptationResult } from '../adaptation';
import { createMockWriterScenePatch, planNovelAdaptationMock } from '../adaptation';
import type { ScreenplayDocument } from '../screenplay';
import type {
  ModelAdapter,
  ModelCallRequest,
  ModelCallResult,
  ModelProviderConfig,
  ModelProviderType,
  ModelStage,
  ModelStagePayloadMap,
} from './types';

// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------

export const MOCK_PROVIDER_CONFIG: ModelProviderConfig = {
  provider: 'mock',
  timeoutMs: 30_000,
};

// ---------------------------------------------------------------------------
// Internal context
// ---------------------------------------------------------------------------

/**
 * Getters so the adapter always reads the latest React state without
 * recreating the adapter on every render.
 */
export type MockAdapterContext = {
  getDocument: () => ScreenplayDocument;
  getPreferences: () => AdaptationPreferences;
  getPlan: () => AdaptationPlan | undefined;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a `NovelAdaptationResult` into a `ModelCallResult`.
 *
 * The trace outcome is derived from whether the expected artifact is
 * actually present — not hard-coded to `success`.
 */
const mapResult = <TData>(
  result: NovelAdaptationResult,
  provider: ModelProviderType,
  stage: string,
  data: TData | null,
  runId?: string,
  errorMessage?: string,
): ModelCallResult<TData> => {
  const artifactPresent = data !== null && data !== undefined;
  const firstError = result.diagnostics.find((d) => d.severity === 'error');

  return {
    data,
    diagnostics: result.diagnostics,
    trace: {
      provider,
      stage,
      outcome: artifactPresent ? 'success' : 'error',
      fallbackReason: artifactPresent ? undefined : 'semantic',
    },
    error: artifactPresent
      ? undefined
      : {
          reason: 'semantic',
          message:
            errorMessage ?? firstError?.message ?? 'Model did not produce the expected artifact.',
        },
    runId,
  };
};

const unknownStageResult = <TData>(stage: string, runId?: string): ModelCallResult<TData> => ({
  data: null,
  diagnostics: [
    {
      severity: 'warning',
      code: 'unknown_model_stage',
      message: `No handler registered for model stage: ${stage}`,
      path: 'model.stage',
    },
  ],
  trace: {
    provider: 'mock',
    stage,
    outcome: 'fallback',
    fallbackReason: 'semantic',
  },
  error: {
    reason: 'semantic',
    message: `No handler registered for model stage: ${stage}`,
  },
  runId,
});

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createMockModelAdapter = (ctx: MockAdapterContext): ModelAdapter => ({
  config: MOCK_PROVIDER_CONFIG,

  async call<S extends ModelStage>(
    request: ModelCallRequest<S>,
  ): Promise<ModelCallResult<ModelStagePayloadMap[S]>> {
    const { stage, runId } = request;

    // -- adaptation plan generation --
    if (stage === 'adaptation_planning') {
      const result = planNovelAdaptationMock({
        document: ctx.getDocument(),
        preferences: ctx.getPreferences(),
      });
      return mapResult(
        result,
        MOCK_PROVIDER_CONFIG.provider,
        stage,
        result.plan ?? null,
        runId,
      ) as ModelCallResult<ModelStagePayloadMap[S]>;
    }

    // -- scene draft generation --
    if (stage === 'scene_draft') {
      const plan = ctx.getPlan();
      if (!plan) {
        return {
          data: null,
          diagnostics: [
            {
              severity: 'error',
              code: 'no_plan_for_draft',
              message: 'No adaptation plan available — generate an outline first.',
              path: 'adaptation',
            },
          ],
          trace: {
            provider: MOCK_PROVIDER_CONFIG.provider,
            stage,
            outcome: 'error',
            fallbackReason: 'semantic',
          },
          error: {
            reason: 'semantic',
            message: 'No adaptation plan available — generate an outline first.',
          },
          runId,
        } as ModelCallResult<ModelStagePayloadMap[S]>;
      }

      const { patch, diagnostics } = createMockWriterScenePatch(plan, ctx.getDocument());
      return {
        data: patch as ModelStagePayloadMap[S],
        diagnostics: [...diagnostics],
        trace: {
          provider: MOCK_PROVIDER_CONFIG.provider,
          stage,
          outcome: 'success',
        },
        runId,
      } as ModelCallResult<ModelStagePayloadMap[S]>;
    }

    // -- fallback for unrecognised stages --
    return unknownStageResult(stage, runId) as ModelCallResult<ModelStagePayloadMap[S]>;
  },
});
