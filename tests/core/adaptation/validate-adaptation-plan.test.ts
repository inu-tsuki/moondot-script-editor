import { describe, expect, it } from 'vitest';
import { createMockAdaptationPlan, validateAdaptationPlan } from '../../../src/core/adaptation';
import { demoScreenplayDocument } from '../../../src/core/screenplay';
import type { AdaptationPlan } from '../../../src/core/adaptation';
import type { ScreenplayDocument } from '../../../src/core/screenplay';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const doc: ScreenplayDocument = demoScreenplayDocument;
const novelSource = doc.source.type === 'novel' ? doc.source : null;
const knownChapterIds = new Set(novelSource?.chapters.map((c) => c.id) ?? []);

const makeValidPlan = (): AdaptationPlan =>
  createMockAdaptationPlan(
    doc,
    doc.source as Extract<ScreenplayDocument['source'], { type: 'novel' }>,
    {},
  );

// Re-create without cross-chapter merging so we get the legacy 1-chapter-per-scene plan.
const makeSingleChapterPlan = (): AdaptationPlan => {
  const plan = makeValidPlan();
  // Override each scene card to reference exactly one chapter.
  const chapterIds = [...knownChapterIds];
  return {
    ...plan,
    sceneOutline: plan.sceneOutline.map((card, i) => ({
      ...card,
      sourceRefs: [{ kind: 'chapter' as const, sourceId: chapterIds[i % chapterIds.length] }],
    })),
  };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateAdaptationPlan', () => {
  describe('valid input', () => {
    it('accepts a complete AdaptationPlan with cross-chapter scenes', () => {
      const plan = makeValidPlan();
      const result = validateAdaptationPlan(plan, { knownChapterIds });

      expect(result.plan).not.toBeNull();
      expect(result.plan?.id).toBe(plan.id);
      expect(result.error).toBeUndefined();
      // Mock plan groups chapters in pairs, so at least one scene has 2+ sourceRefs.
      expect(result.diagnostics.some((d) => d.code === 'no_cross_chapter_scene')).toBe(false);
    });

    it('emits a warning when no scene references multiple chapters', () => {
      const plan = makeSingleChapterPlan();
      const result = validateAdaptationPlan(plan, { knownChapterIds });

      expect(result.plan).not.toBeNull();
      expect(result.diagnostics.some((d) => d.code === 'no_cross_chapter_scene')).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('null / non-object guard', () => {
    it('rejects null with schema error', () => {
      const result = validateAdaptationPlan(null, { knownChapterIds });

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
      expect(result.diagnostics[0].severity).toBe('error');
    });

    it('rejects undefined with schema error', () => {
      const result = validateAdaptationPlan(undefined, { knownChapterIds });

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });

    it('rejects a string with schema error', () => {
      const result = validateAdaptationPlan('not an object', { knownChapterIds });

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });

    it('rejects an array with schema error', () => {
      const result = validateAdaptationPlan([], { knownChapterIds });

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });
  });

  describe('top-level fields', () => {
    it('rejects a plan missing id', () => {
      const plan = makeValidPlan();
      const missing = { ...plan };
      delete (missing as Record<string, unknown>).id;
      const result = validateAdaptationPlan(missing, { knownChapterIds });

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });

    it('rejects a plan with non-string id', () => {
      const plan = makeValidPlan();
      const result = validateAdaptationPlan({ ...plan, id: 42 }, { knownChapterIds });

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });
  });

  describe('sourceAnalysis', () => {
    it('rejects when sourceAnalysis is missing', () => {
      const plan = makeValidPlan();
      const missing = { ...plan };
      delete (missing as Record<string, unknown>).sourceAnalysis;
      const result = validateAdaptationPlan(missing, { knownChapterIds });

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });

    it('rejects when coreEvents is not an array', () => {
      const plan = makeValidPlan();
      const result = validateAdaptationPlan(
        {
          ...plan,
          sourceAnalysis: { ...plan.sourceAnalysis, coreEvents: 'not array' },
        },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });
  });

  describe('sceneOutline', () => {
    it('rejects when sceneOutline is not an array', () => {
      const plan = makeValidPlan();
      const result = validateAdaptationPlan(
        { ...plan, sceneOutline: 'not array' },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });

    it('rejects a SceneCard missing dramaticPurpose', () => {
      const plan = makeValidPlan();
      const brokenCards = plan.sceneOutline.map((card) => {
        const rest = { ...card };
        delete (rest as Record<string, unknown>).dramaticPurpose;
        return rest;
      });
      const result = validateAdaptationPlan(
        { ...plan, sceneOutline: brokenCards },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });

    it('rejects a SceneCard with non-number estimatedBlocks', () => {
      const plan = makeValidPlan();
      const brokenCards = plan.sceneOutline.map((card) => ({
        ...card,
        estimatedBlocks: 'five',
      }));
      const result = validateAdaptationPlan(
        { ...plan, sceneOutline: brokenCards },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });

    it('rejects a SceneCard referencing a non-existent chapter', () => {
      const plan = makeValidPlan();
      const brokenCards = [
        {
          ...plan.sceneOutline[0],
          sourceRefs: [{ kind: 'chapter' as const, sourceId: 'ch_nonexistent' }],
        },
        ...plan.sceneOutline.slice(1),
      ];
      const result = validateAdaptationPlan(
        { ...plan, sceneOutline: brokenCards },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('semantic');
      expect(result.diagnostics[0].code).toBe('unknown_source_ref');
    });

    it('accepts a SceneCard with 3 sourceRefs', () => {
      const plan = makeValidPlan();
      const chapterIds = [...knownChapterIds];
      const threeRefs = chapterIds.slice(0, 3).map((id) => ({
        kind: 'chapter' as const,
        sourceId: id,
      }));
      const cards = [
        { ...plan.sceneOutline[0], sourceRefs: threeRefs },
        ...plan.sceneOutline.slice(1),
      ];
      const result = validateAdaptationPlan({ ...plan, sceneOutline: cards }, { knownChapterIds });

      expect(result.plan).not.toBeNull();
      expect(result.error).toBeUndefined();
    });
  });

  describe('adaptationQuestions', () => {
    it('rejects when adaptationQuestions is not an array', () => {
      const plan = makeValidPlan();
      const result = validateAdaptationPlan(
        { ...plan, adaptationQuestions: null },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });

    it('rejects a question with invalid sourceRef', () => {
      const plan = makeValidPlan();
      const brokenQuestions = [
        {
          ...plan.adaptationQuestions[0],
          sourceRefs: [{ kind: 'chapter' as const, sourceId: 'ch_ghost' }],
        },
        ...plan.adaptationQuestions.slice(1),
      ];
      const result = validateAdaptationPlan(
        { ...plan, adaptationQuestions: brokenQuestions },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('semantic');
    });
  });

  describe('headingSuggestion', () => {
    it('rejects a SceneCard with missing headingSuggestion', () => {
      const plan = makeValidPlan();
      const brokenCards = plan.sceneOutline.map((card) => {
        const rest = { ...card };
        delete (rest as Record<string, unknown>).headingSuggestion;
        return rest;
      });
      const result = validateAdaptationPlan(
        { ...plan, sceneOutline: brokenCards },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });

    it('rejects a SceneCard with empty locationType', () => {
      const plan = makeValidPlan();
      const brokenCards = plan.sceneOutline.map((card) => ({
        ...card,
        headingSuggestion: { ...card.headingSuggestion, locationType: '' },
      }));
      const result = validateAdaptationPlan(
        { ...plan, sceneOutline: brokenCards },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });
  });

  describe('SceneCard required fields', () => {
    it('rejects a SceneCard missing pacing', () => {
      const plan = makeValidPlan();
      const brokenCards = plan.sceneOutline.map((card) => {
        const rest = { ...card };
        delete (rest as Record<string, unknown>).pacing;
        return rest;
      });
      const result = validateAdaptationPlan(
        { ...plan, sceneOutline: brokenCards },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });

    it('rejects a SceneCard with empty sourceRefs', () => {
      const plan = makeValidPlan();
      const brokenCards = plan.sceneOutline.map((card) => ({
        ...card,
        sourceRefs: [],
      }));
      const result = validateAdaptationPlan(
        { ...plan, sceneOutline: brokenCards },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });

    it('rejects a SceneCard with sourceRef missing kind', () => {
      const plan = makeValidPlan();
      const brokenCards = [
        {
          ...plan.sceneOutline[0],
          sourceRefs: [{ sourceId: plan.sceneOutline[0].sourceRefs[0].sourceId }],
        },
        ...plan.sceneOutline.slice(1),
      ];
      const result = validateAdaptationPlan(
        { ...plan, sceneOutline: brokenCards },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });
  });

  describe('question / answer reference integrity', () => {
    it('rejects a recommendedOptionId not in options', () => {
      const plan = makeValidPlan();
      const brokenQuestions = plan.adaptationQuestions.map((q) => ({
        ...q,
        recommendedOptionId: 'nonexistent_option',
      }));
      const result = validateAdaptationPlan(
        { ...plan, adaptationQuestions: brokenQuestions },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('semantic');
    });

    it('rejects an answer with invalid source', () => {
      const plan = makeValidPlan();
      const brokenAnswers = plan.questionAnswers.map((a) => ({
        ...a,
        source: 'unknown',
      }));
      const result = validateAdaptationPlan(
        { ...plan, questionAnswers: brokenAnswers },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });

    it('rejects an answer referencing a non-existent question', () => {
      const plan = makeValidPlan();
      const brokenAnswers = [
        {
          questionId: 'question_ghost',
          optionId: 'compress_for_conflict',
          source: 'recommended' as const,
        },
      ];
      const result = validateAdaptationPlan(
        { ...plan, questionAnswers: brokenAnswers },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('semantic');
    });

    it('rejects an answer referencing a non-existent option', () => {
      const plan = makeValidPlan();
      const answerQuestionId = plan.adaptationQuestions[0]?.id ?? 'question_001';
      const brokenAnswers = [
        {
          questionId: answerQuestionId,
          optionId: 'option_ghost',
          source: 'recommended' as const,
        },
      ];
      const result = validateAdaptationPlan(
        { ...plan, questionAnswers: brokenAnswers },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('semantic');
    });
  });

  describe('sourceRef.kind enforcement', () => {
    it('rejects a SceneCard with kind: "seed" instead of "chapter"', () => {
      const plan = makeValidPlan();
      const brokenCards = [
        {
          ...plan.sceneOutline[0],
          sourceRefs: [{ kind: 'seed', sourceId: plan.sceneOutline[0].sourceRefs[0].sourceId }],
        },
        ...plan.sceneOutline.slice(1),
      ];
      const result = validateAdaptationPlan(
        { ...plan, sceneOutline: brokenCards },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
      // Zod z.literal('chapter') rejects non-chapter kinds.
      expect(result.diagnostics[0].code).toMatch(/^zod_/);
    });

    it('rejects an AdaptationQuestion with kind: "outline" instead of "chapter"', () => {
      const plan = makeValidPlan();
      const brokenQuestions = plan.adaptationQuestions.map((q) => ({
        ...q,
        sourceRefs: [{ kind: 'outline', sourceId: q.sourceRefs[0].sourceId }],
      }));
      const result = validateAdaptationPlan(
        { ...plan, adaptationQuestions: brokenQuestions },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });
  });

  describe('sceneOutline non-emptiness', () => {
    it('rejects an empty sceneOutline (Zod min(1) catches as schema)', () => {
      const plan = makeValidPlan();
      const result = validateAdaptationPlan({ ...plan, sceneOutline: [] }, { knownChapterIds });

      expect(result.plan).toBeNull();
      // Zod .min(1) rejects empty arrays as schema failures.
      expect(result.error?.reason).toBe('schema');
      expect(result.diagnostics[0].code).toMatch(/^zod_/);
    });
  });

  describe('union value enforcement', () => {
    it('rejects an invalid pacing value', () => {
      const plan = makeValidPlan();
      const brokenCards = plan.sceneOutline.map((card) => ({
        ...card,
        pacing: 'ultra_fast',
      }));
      const result = validateAdaptationPlan(
        { ...plan, sceneOutline: brokenCards },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
      // Zod z.enum rejects invalid union values.
      expect(result.diagnostics[0].code).toMatch(/^zod_/);
    });

    it('rejects an invalid locationType', () => {
      const plan = makeValidPlan();
      const brokenCards = plan.sceneOutline.map((card) => ({
        ...card,
        headingSuggestion: { ...card.headingSuggestion, locationType: 'INDOOR' },
      }));
      const result = validateAdaptationPlan(
        { ...plan, sceneOutline: brokenCards },
        { knownChapterIds },
      );

      expect(result.plan).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });

    it('accepts valid pacing and locationType values', () => {
      const plan = makeValidPlan();
      // The mock plan already generates valid values. Verify they pass.
      const result = validateAdaptationPlan(plan, { knownChapterIds });

      expect(result.plan).not.toBeNull();
      expect(result.error).toBeUndefined();
      // Check known valid values are in the plan
      for (const card of result.plan!.sceneOutline) {
        expect(['slow', 'balanced', 'fast']).toContain(card.pacing);
        expect(['INT', 'EXT', 'INT_EXT']).toContain(card.headingSuggestion.locationType);
      }
    });
  });
});
