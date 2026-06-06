import { describe, expect, it } from 'vitest';
import { adaptationPlanSchema } from '../../../src/core/adaptation/adaptation-plan-schema';
import { createMockAdaptationPlan } from '../../../src/core/adaptation';
import { demoScreenplayDocument } from '../../../src/core/screenplay';
import type { AdaptationPlan } from '../../../src/core/adaptation';
import type { ScreenplayDocument } from '../../../src/core/screenplay';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const doc: ScreenplayDocument = demoScreenplayDocument;

const makeValidPlan = (): AdaptationPlan =>
  createMockAdaptationPlan(
    doc,
    doc.source as Extract<ScreenplayDocument['source'], { type: 'novel' }>,
    {},
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('adaptationPlanSchema', () => {
  describe('valid plan', () => {
    it('safeParse succeeds on a complete valid plan', () => {
      const plan = makeValidPlan();
      const result = adaptationPlanSchema.safeParse(plan);

      expect(result.success).toBe(true);
    });
  });

  describe('top-level fields', () => {
    it('fails when id is missing', () => {
      const plan = makeValidPlan();
      const missing = { ...plan };
      delete (missing as Record<string, unknown>).id;

      const result = adaptationPlanSchema.safeParse(missing);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('id'))).toBe(true);
      }
    });
  });

  describe('sceneOutline', () => {
    it('fails on empty sceneOutline', () => {
      const plan = makeValidPlan();
      const result = adaptationPlanSchema.safeParse({ ...plan, sceneOutline: [] });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('sceneOutline'))).toBe(true);
      }
    });

    it('fails on empty sourceRefs in a SceneCard', () => {
      const plan = makeValidPlan();
      const broken = {
        ...plan,
        sceneOutline: plan.sceneOutline.map((card) => ({ ...card, sourceRefs: [] })),
      };

      const result = adaptationPlanSchema.safeParse(broken);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (i) => i.path.includes('sourceRefs') && i.path.includes('sceneOutline'),
          ),
        ).toBe(true);
      }
    });
  });

  describe('union value enforcement', () => {
    it('fails on invalid pacing value', () => {
      const plan = makeValidPlan();
      const broken = {
        ...plan,
        sceneOutline: plan.sceneOutline.map((card) => ({ ...card, pacing: 'ultra_fast' })),
      };

      const result = adaptationPlanSchema.safeParse(broken);
      expect(result.success).toBe(false);
    });

    it('fails on invalid locationType', () => {
      const plan = makeValidPlan();
      const broken = {
        ...plan,
        sceneOutline: plan.sceneOutline.map((card) => ({
          ...card,
          headingSuggestion: { ...card.headingSuggestion, locationType: 'INDOOR' },
        })),
      };

      const result = adaptationPlanSchema.safeParse(broken);
      expect(result.success).toBe(false);
    });

    it('fails on sourceRef.kind not "chapter"', () => {
      const plan = makeValidPlan();
      const broken = {
        ...plan,
        sceneOutline: [
          {
            ...plan.sceneOutline[0],
            sourceRefs: [{ kind: 'seed', sourceId: plan.sceneOutline[0].sourceRefs[0].sourceId }],
          },
          ...plan.sceneOutline.slice(1),
        ],
      };

      const result = adaptationPlanSchema.safeParse(broken);
      expect(result.success).toBe(false);
    });
  });

  describe('preferences', () => {
    it('fails on invalid targetMedium', () => {
      const plan = makeValidPlan();
      const broken = {
        ...plan,
        preferences: { ...plan.preferences, targetMedium: 'film' },
      };

      const result = adaptationPlanSchema.safeParse(broken);
      expect(result.success).toBe(false);
    });

    it('fails on invalid fidelity', () => {
      const plan = makeValidPlan();
      const broken = {
        ...plan,
        preferences: { ...plan.preferences, fidelity: 'exact' },
      };

      const result = adaptationPlanSchema.safeParse(broken);
      expect(result.success).toBe(false);
    });
  });

  describe('questionAnswers', () => {
    it('fails on invalid answer source', () => {
      const plan = makeValidPlan();
      const broken = {
        ...plan,
        questionAnswers: plan.questionAnswers.map((a) => ({ ...a, source: 'auto' })),
      };

      const result = adaptationPlanSchema.safeParse(broken);
      expect(result.success).toBe(false);
    });
  });

  describe('required sub-fields', () => {
    it('fails when adaptationQuestionOption.impact is missing', () => {
      const plan = makeValidPlan();
      const broken = {
        ...plan,
        adaptationQuestions: plan.adaptationQuestions.map((q) => ({
          ...q,
          options: q.options.map((opt) => {
            const rest = { ...opt };
            delete (rest as Record<string, unknown>).impact;
            return rest;
          }),
        })),
      };

      const result = adaptationPlanSchema.safeParse(broken);
      expect(result.success).toBe(false);
    });

    it('fails when adaptationOption.tradeoffs is missing', () => {
      const plan = makeValidPlan();
      const broken = {
        ...plan,
        adaptationOptions: plan.adaptationOptions.map((opt) => {
          const rest = { ...opt };
          delete (rest as Record<string, unknown>).tradeoffs;
          return rest;
        }),
      };

      const result = adaptationPlanSchema.safeParse(broken);
      expect(result.success).toBe(false);
    });
  });
});
