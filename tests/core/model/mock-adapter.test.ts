import { describe, expect, it } from 'vitest';
import { createMockModelAdapter, MOCK_PROVIDER_CONFIG } from '../../../src/core/model';
import { defaultAdaptationPreferences } from '../../../src/core/adaptation';
import { demoScreenplayDocument } from '../../../src/core/screenplay';
import type { AdaptationPlan, AdaptationPreferences } from '../../../src/core/adaptation';
import type { ScreenplayDocument } from '../../../src/core/screenplay';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const novelDocument = demoScreenplayDocument;

const unsupportedSourceDocument: ScreenplayDocument = {
  ...novelDocument,
  source: { type: 'outline', outline: 'No chapters here.' },
};

const emptyChapterDocument: ScreenplayDocument = {
  ...novelDocument,
  source: {
    ...novelDocument.source,
    chapters: [],
  },
};

const createContext = (
  document: ScreenplayDocument,
  preferences: AdaptationPreferences = defaultAdaptationPreferences,
  plan?: AdaptationPlan,
) => ({
  getDocument: () => document,
  getPreferences: () => preferences,
  getPlan: () => plan,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mock model adapter', () => {
  it('exposes the mock provider config', () => {
    const adapter = createMockModelAdapter(createContext(novelDocument));

    expect(adapter.config).toEqual(MOCK_PROVIDER_CONFIG);
  });

  describe('adaptation_planning stage', () => {
    it('returns a plan with success trace when source is a novel with chapters', async () => {
      const adapter = createMockModelAdapter(createContext(novelDocument));
      const result = await adapter.call({
        messages: [],
        stage: 'adaptation_planning',
      });

      expect(result.data).not.toBeNull();
      expect(result.data?.sceneOutline.length).toBeGreaterThan(0);
      expect(result.trace.outcome).toBe('success');
      expect(result.trace.fallbackReason).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('returns null data and error trace when source is unsupported', async () => {
      const adapter = createMockModelAdapter(createContext(unsupportedSourceDocument));
      const result = await adapter.call({
        messages: [],
        stage: 'adaptation_planning',
      });

      expect(result.data).toBeNull();
      expect(result.trace.outcome).toBe('error');
      expect(result.trace.fallbackReason).toBe('semantic');
      expect(result.diagnostics.some((d) => d.code === 'unsupported_adaptation_source')).toBe(true);
      expect(result.error).toBeDefined();
      expect(result.error?.reason).toBe('semantic');
    });

    it('returns null data and error trace when chapters are empty', async () => {
      const adapter = createMockModelAdapter(createContext(emptyChapterDocument));
      const result = await adapter.call({
        messages: [],
        stage: 'adaptation_planning',
      });

      expect(result.data).toBeNull();
      expect(result.trace.outcome).toBe('error');
      expect(result.trace.fallbackReason).toBe('semantic');
      expect(result.diagnostics.some((d) => d.code === 'empty_adaptation_source')).toBe(true);
      expect(result.error).toBeDefined();
      expect(result.error?.reason).toBe('semantic');
    });

    it('echoes the runId from the request', async () => {
      const adapter = createMockModelAdapter(createContext(novelDocument));
      const result = await adapter.call({
        messages: [],
        stage: 'adaptation_planning',
        runId: 'test-run-001',
      });

      expect(result.runId).toBe('test-run-001');
    });
  });

  describe('scene_draft stage', () => {
    it('returns a document with success trace when a plan is available', async () => {
      // First generate a plan so we have one to pass.
      const planAdapter = createMockModelAdapter(createContext(novelDocument));
      const planResult = await planAdapter.call({
        messages: [],
        stage: 'adaptation_planning',
      });
      const plan = planResult.data!;

      const adapter = createMockModelAdapter(
        createContext(novelDocument, defaultAdaptationPreferences, plan),
      );
      const result = await adapter.call({
        messages: [],
        stage: 'scene_draft',
      });

      expect(result.data).not.toBeNull();
      expect(result.data?.script.scenes.length).toBeGreaterThan(0);
      expect(result.trace.outcome).toBe('success');
      expect(result.trace.fallbackReason).toBeUndefined();
    });

    it('returns error when no plan exists', async () => {
      const adapter = createMockModelAdapter(createContext(novelDocument));
      const result = await adapter.call({
        messages: [],
        stage: 'scene_draft',
      });

      expect(result.data).toBeNull();
      expect(result.trace.outcome).toBe('error');
      expect(result.trace.fallbackReason).toBe('semantic');
      expect(result.diagnostics.some((d) => d.code === 'no_plan_for_draft')).toBe(true);
      expect(result.error).toBeDefined();
      expect(result.error?.reason).toBe('semantic');
    });
  });

  describe('stage routing guard', () => {
    it('handles adaptation_planning (not fallback)', async () => {
      const adapter = createMockModelAdapter(createContext(novelDocument));
      const result = await adapter.call({
        messages: [],
        stage: 'adaptation_planning',
      });

      // Known stages must not hit the unknown-stage fallback path.
      expect(result.trace.outcome).not.toBe('fallback');
      expect(result.data).not.toBeNull();
    });
  });

  describe('type safety', () => {
    it('returns AdaptationPlan for adaptation_planning stage (runtime check)', async () => {
      const adapter = createMockModelAdapter(createContext(novelDocument));
      const result = await adapter.call({
        messages: [],
        stage: 'adaptation_planning',
      });

      // Verify the shape matches AdaptationPlan at runtime.
      const plan = result.data;
      expect(plan).toBeTruthy();
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('sceneOutline');
      expect(plan).toHaveProperty('sourceAnalysis');
      expect(plan).toHaveProperty('preferences');
      expect(Array.isArray(plan!.sceneOutline)).toBe(true);
    });

    it('returns ScreenplayDocument for scene_draft stage (runtime check)', async () => {
      const planAdapter = createMockModelAdapter(createContext(novelDocument));
      const planResult = await planAdapter.call({
        messages: [],
        stage: 'adaptation_planning',
      });

      const adapter = createMockModelAdapter(
        createContext(novelDocument, defaultAdaptationPreferences, planResult.data!),
      );
      const result = await adapter.call({
        messages: [],
        stage: 'scene_draft',
      });

      // Verify the shape matches ScreenplayDocument at runtime.
      const doc = result.data;
      expect(doc).toBeTruthy();
      expect(doc).toHaveProperty('documentVersion');
      expect(doc).toHaveProperty('project');
      expect(doc).toHaveProperty('source');
      expect(doc).toHaveProperty('characters');
      expect(doc).toHaveProperty('script');
      expect(Array.isArray(doc!.script.scenes)).toBe(true);
    });
  });
});
