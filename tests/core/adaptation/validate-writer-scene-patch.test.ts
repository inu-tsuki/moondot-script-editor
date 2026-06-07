import { describe, expect, it } from 'vitest';
import { validateWriterScenePatch } from '../../../src/core/adaptation/validate-writer-scene-patch';
import { createMockWriterScenePatch } from '../../../src/core/adaptation';
import { createMockAdaptationPlan } from '../../../src/core/adaptation';
import { demoScreenplayDocument } from '../../../src/core/screenplay';
import type { AdaptationPlan, WriterScenePatch } from '../../../src/core/adaptation';
import type { ScreenplayDocument } from '../../../src/core/screenplay';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const doc: ScreenplayDocument = demoScreenplayDocument;
const novelSource = doc.source as Extract<ScreenplayDocument['source'], { type: 'novel' }>;

const makeValidPlan = (): AdaptationPlan => createMockAdaptationPlan(doc, novelSource, {});

const makeValidPatch = (plan: AdaptationPlan): WriterScenePatch => {
  const { patch } = createMockWriterScenePatch(plan, doc);
  return patch;
};

const knownChapterIds = new Set(novelSource.chapters.map((c) => c.id));
const knownCharacterIds = new Set(doc.characters.map((c) => c.id));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateWriterScenePatch', () => {
  describe('valid patch', () => {
    it('returns the patch with no error', () => {
      const plan = makeValidPlan();
      const patch = makeValidPatch(plan);
      const result = validateWriterScenePatch(patch, {
        plan,
        knownChapterIds,
        knownCharacterIds,
      });

      expect(result.patch).not.toBeNull();
      expect(result.error).toBeUndefined();
    });
  });

  describe('semantic: planId', () => {
    it('fails when planId does not match the current plan', () => {
      const plan = makeValidPlan();
      const patch = makeValidPatch(plan);
      const result = validateWriterScenePatch(
        { ...patch, planId: 'wrong_plan_id' },
        { plan, knownChapterIds, knownCharacterIds },
      );

      expect(result.patch).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.reason).toBe('semantic');
      expect(result.diagnostics.some((d) => d.code === 'plan_id_mismatch')).toBe(true);
    });
  });

  describe('semantic: sceneCardId', () => {
    it('fails when sceneCardId does not exist in plan.sceneOutline', () => {
      const plan = makeValidPlan();
      const patch = makeValidPatch(plan);
      const broken = {
        ...patch,
        scenes: patch.scenes.map((s) => ({ ...s, sceneCardId: 'unknown_card_id' })),
      };

      const result = validateWriterScenePatch(broken, {
        plan,
        knownChapterIds,
        knownCharacterIds,
      });

      expect(result.patch).toBeNull();
      expect(result.error?.reason).toBe('semantic');
      expect(result.diagnostics.some((d) => d.code === 'unknown_scene_card_id')).toBe(true);
    });
  });

  describe('semantic: sourceRef sourceId', () => {
    it('fails when sourceRef references unknown chapter', () => {
      const plan = makeValidPlan();
      const patch = makeValidPatch(plan);
      const broken = {
        ...patch,
        scenes: patch.scenes.map((s) => ({
          ...s,
          sourceRefs: [{ kind: 'chapter' as const, sourceId: 'ch_unknown' }],
        })),
      };

      const result = validateWriterScenePatch(broken, {
        plan,
        knownChapterIds,
        knownCharacterIds,
      });

      expect(result.patch).toBeNull();
      expect(result.error?.reason).toBe('semantic');
      expect(result.diagnostics.some((d) => d.code === 'unknown_source_ref')).toBe(true);
    });
  });

  describe('semantic: character reference', () => {
    it('emits warning when dialogue block references unknown character', () => {
      const plan = makeValidPlan();
      const patch = makeValidPatch(plan);
      const broken = {
        ...patch,
        scenes: patch.scenes.map((s) => ({
          ...s,
          blocks: s.blocks.map((b) =>
            b.type === 'dialogue' ? { ...b, characterId: 'char_unknown' } : b,
          ),
        })),
      };

      const result = validateWriterScenePatch(broken, {
        plan,
        knownChapterIds,
        knownCharacterIds,
      });

      // Unknown character is a warning, not fatal — patch still returned.
      expect(result.patch).not.toBeNull();
      expect(result.error).toBeUndefined();
      expect(result.diagnostics.some((d) => d.code === 'unknown_character_ref')).toBe(true);
    });
  });

  describe('schema failure (Zod)', () => {
    it('returns schema error when patch is structurally invalid', () => {
      const plan = makeValidPlan();
      const result = validateWriterScenePatch(
        { planId: 'x', scenes: [] },
        { plan, knownChapterIds, knownCharacterIds },
      );

      expect(result.patch).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.reason).toBe('schema');
      expect(result.diagnostics.some((d) => d.code.startsWith('zod_'))).toBe(true);
    });

    it('returns schema error for null input', () => {
      const plan = makeValidPlan();
      const result = validateWriterScenePatch(null, {
        plan,
        knownChapterIds,
        knownCharacterIds,
      });

      expect(result.patch).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });
  });
});
