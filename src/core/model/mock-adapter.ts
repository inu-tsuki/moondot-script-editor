import type { AdaptationPlan, AdaptationPreferences, NovelAdaptationResult } from '../adaptation';
import { draftNovelAdaptationFromPlanMock, planNovelAdaptationMock } from '../adaptation';
import type { ScreenplayDocument } from '../screenplay';
import type {
  ModelAdapter,
  ModelCallRequest,
  ModelCallResult,
  ModelProviderConfig,
  ModelProviderType,
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

const mapResult = <TData>(
  result: NovelAdaptationResult,
  provider: ModelProviderType,
  stage: string,
  data: TData | null,
): ModelCallResult<TData> => ({
  data,
  diagnostics: result.diagnostics,
  trace: {
    provider,
    stage,
    outcome: 'success',
  },
});

const unknownStageResult = <TData>(stage: string): ModelCallResult<TData> => ({
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
});

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createMockModelAdapter = (ctx: MockAdapterContext): ModelAdapter => ({
  config: MOCK_PROVIDER_CONFIG,

  async call<TData>(request: ModelCallRequest): Promise<ModelCallResult<TData>> {
    const { stage } = request;

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
        (result.plan ?? null) as TData,
      );
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
        } as ModelCallResult<TData>;
      }

      const result = draftNovelAdaptationFromPlanMock({
        document: ctx.getDocument(),
        plan,
      });
      return mapResult(result, MOCK_PROVIDER_CONFIG.provider, stage, result.document as TData);
    }

    // -- fallback for unrecognised stages --
    return unknownStageResult(stage);
  },
});
