import { describe, expect, it } from 'vitest';
import { validateWriterScenePatch } from '../../../src/core/adaptation/validate-writer-scene-patch';
import { applySceneDrafts, createMockWriterScenePatch } from '../../../src/core/adaptation';
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

const defaultOptions = (plan: AdaptationPlan) => ({
  plan,
  knownChapterIds,
  knownCharacterIds,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateWriterScenePatch', () => {
  describe('valid patch', () => {
    it('returns the patch with no error', () => {
      const plan = makeValidPlan();
      const patch = makeValidPatch(plan);
      const result = validateWriterScenePatch(patch, defaultOptions(plan));

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
        defaultOptions(plan),
      );

      expect(result.patch).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.reason).toBe('semantic');
      expect(result.diagnostics.some((d) => d.code === 'plan_id_mismatch')).toBe(true);
    });
  });

  describe('semantic: sceneCardId coverage', () => {
    it('fails when sceneCardId does not exist in plan.sceneOutline', () => {
      const plan = makeValidPlan();
      const patch = makeValidPatch(plan);
      const broken = {
        ...patch,
        scenes: patch.scenes.map((s) => ({
          ...s,
          sceneCardId: 'unknown_card_id',
        })),
      };

      const result = validateWriterScenePatch(broken, defaultOptions(plan));

      expect(result.patch).toBeNull();
      expect(result.error?.reason).toBe('semantic');
      expect(result.diagnostics.some((d) => d.code === 'unknown_scene_card_id')).toBe(true);
    });

    it('fails on duplicate sceneCardId', () => {
      const plan = makeValidPlan();
      const patch = makeValidPatch(plan);
      // Clone the first scene draft to create a duplicate sceneCardId.
      const broken = {
        ...patch,
        scenes: [patch.scenes[0], { ...patch.scenes[0] }],
      };

      const result = validateWriterScenePatch(broken, defaultOptions(plan));

      expect(result.patch).toBeNull();
      expect(result.error?.reason).toBe('semantic');
      expect(result.diagnostics.some((d) => d.code === 'duplicate_scene_card_id')).toBe(true);
    });

    it('fails when a plan sceneCard has no corresponding draft', () => {
      const plan = makeValidPlan();
      const patch = makeValidPatch(plan);
      // Remove the first scene draft — leaving a plan card uncovered.
      const broken = {
        ...patch,
        scenes: patch.scenes.slice(1),
      };

      const result = validateWriterScenePatch(broken, defaultOptions(plan));

      expect(result.patch).toBeNull();
      expect(result.error?.reason).toBe('semantic');
      expect(result.diagnostics.some((d) => d.code === 'missing_scene_card_draft')).toBe(true);
    });
  });

  describe('semantic: sourceRef sourceId', () => {
    it('fails when scene-level sourceRef references unknown chapter', () => {
      const plan = makeValidPlan();
      const patch = makeValidPatch(plan);
      const broken = {
        ...patch,
        scenes: patch.scenes.map((s) => ({
          ...s,
          sourceRefs: [{ kind: 'chapter' as const, sourceId: 'ch_unknown' }],
        })),
      };

      const result = validateWriterScenePatch(broken, defaultOptions(plan));

      expect(result.patch).toBeNull();
      expect(result.error?.reason).toBe('semantic');
      expect(result.diagnostics.some((d) => d.code === 'unknown_source_ref')).toBe(true);
    });

    it('fails when block-level sourceRef references unknown chapter', () => {
      const plan = makeValidPlan();
      const patch = makeValidPatch(plan);
      const broken = {
        ...patch,
        scenes: patch.scenes.map((s) => ({
          ...s,
          blocks: [
            {
              type: 'action' as const,
              text: 'test block',
              sourceRefs: [{ kind: 'chapter' as const, sourceId: 'ch_unknown' }],
            },
          ],
        })),
      };

      const result = validateWriterScenePatch(broken, defaultOptions(plan));

      expect(result.patch).toBeNull();
      expect(result.error?.reason).toBe('semantic');
      expect(result.diagnostics.some((d) => d.code === 'unknown_source_ref')).toBe(true);
    });
  });

  describe('semantic: character reference', () => {
    it('fails when dialogue block references unknown character', () => {
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

      const result = validateWriterScenePatch(broken, defaultOptions(plan));

      // Unknown character is now fatal — must not write invalid references.
      expect(result.patch).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.reason).toBe('semantic');
      expect(result.diagnostics.some((d) => d.code === 'unknown_character_ref')).toBe(true);
    });
  });

  describe('schema failure (Zod)', () => {
    it('returns schema error when patch is structurally invalid', () => {
      const plan = makeValidPlan();
      const result = validateWriterScenePatch({ planId: 'x', scenes: [] }, defaultOptions(plan));

      expect(result.patch).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.reason).toBe('schema');
      expect(result.diagnostics.some((d) => d.code.startsWith('zod_'))).toBe(true);
    });

    it('returns schema error for null input', () => {
      const plan = makeValidPlan();
      const result = validateWriterScenePatch(null, defaultOptions(plan));

      expect(result.patch).toBeNull();
      expect(result.error?.reason).toBe('schema');
    });
  });
});

describe('applySceneDrafts', () => {
  it('writes a validated full patch so scene count matches plan', () => {
    const plan = makeValidPlan();
    const { patch } = createMockWriterScenePatch(plan, doc);
    const result = applySceneDrafts(doc, patch);

    expect(result.script.scenes.length).toBe(plan.sceneOutline.length);
  });

  it('assigns unique block IDs to every block draft', () => {
    const plan = makeValidPlan();
    const { patch } = createMockWriterScenePatch(plan, doc);
    const result = applySceneDrafts(doc, patch);

    const blockIds = new Set(result.script.scenes.flatMap((s) => s.blocks.map((b) => b.id)));
    const totalBlocks = result.script.scenes.reduce((sum, s) => sum + s.blocks.length, 0);
    expect(blockIds.size).toBe(totalBlocks);
    // Verify IDs follow the blk_NNN format.
    for (const id of blockIds) {
      expect(id).toMatch(/^blk_\d{3}$/);
    }
  });

  it('keeps project, source and characters unchanged', () => {
    const plan = makeValidPlan();
    const { patch } = createMockWriterScenePatch(plan, doc);
    const result = applySceneDrafts(doc, patch);

    expect(result.project).toEqual(doc.project);
    expect(result.source).toEqual(doc.source);
    expect(result.characters).toEqual(doc.characters);
  });
});
