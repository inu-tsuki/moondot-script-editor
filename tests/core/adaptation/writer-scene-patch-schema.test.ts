import { describe, expect, it } from 'vitest';
import { writerScenePatchSchema } from '../../../src/core/adaptation/writer-scene-patch-schema';
import { createMockWriterScenePatch } from '../../../src/core/adaptation';
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

const makeValidPatch = () => {
  const plan = makeValidPlan();
  const { patch } = createMockWriterScenePatch(plan, doc);
  return patch;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('writerScenePatchSchema', () => {
  describe('valid patch', () => {
    it('safeParse succeeds on a complete valid patch', () => {
      const patch = makeValidPatch();
      const result = writerScenePatchSchema.safeParse(patch);

      expect(result.success).toBe(true);
    });
  });

  describe('top-level fields', () => {
    it('fails when planId is missing', () => {
      const patch = makeValidPatch();
      const missing = { ...patch };
      delete (missing as Record<string, unknown>).planId;

      const result = writerScenePatchSchema.safeParse(missing);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('planId'))).toBe(true);
      }
    });

    it('fails on empty scenes array', () => {
      const patch = makeValidPatch();
      const result = writerScenePatchSchema.safeParse({ ...patch, scenes: [] });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('scenes'))).toBe(true);
      }
    });

    it('succeeds when characterUpdates is omitted', () => {
      const patch = makeValidPatch();
      const rest = { ...patch };
      delete (rest as Record<string, unknown>).characterUpdates;

      const result = writerScenePatchSchema.safeParse(rest);
      expect(result.success).toBe(true);
    });
  });

  describe('scene drafts', () => {
    it('fails on empty blocks array', () => {
      const patch = makeValidPatch();
      const broken = {
        ...patch,
        scenes: patch.scenes.map((s) => ({ ...s, blocks: [] })),
      };

      const result = writerScenePatchSchema.safeParse(broken);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.path.includes('blocks') && i.path.includes('scenes')),
        ).toBe(true);
      }
    });

    it('fails on empty sourceRefs', () => {
      const patch = makeValidPatch();
      const broken = {
        ...patch,
        scenes: patch.scenes.map((s) => ({ ...s, sourceRefs: [] })),
      };

      const result = writerScenePatchSchema.safeParse(broken);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (i) => i.path.includes('sourceRefs') && i.path.includes('scenes'),
          ),
        ).toBe(true);
      }
    });

    it('fails when sceneCardId is missing', () => {
      const patch = makeValidPatch();
      const broken = {
        ...patch,
        scenes: patch.scenes.map((s) => {
          const rest = { ...s };
          delete (rest as Record<string, unknown>).sceneCardId;
          return rest;
        }),
      };

      const result = writerScenePatchSchema.safeParse(broken);
      expect(result.success).toBe(false);
    });
  });

  describe('union value enforcement', () => {
    it('fails on sourceRef.kind not "chapter"', () => {
      const patch = makeValidPatch();
      const broken = {
        ...patch,
        scenes: patch.scenes.map((s) => ({
          ...s,
          sourceRefs: [{ kind: 'seed', sourceId: s.sourceRefs[0].sourceId }],
        })),
      };

      const result = writerScenePatchSchema.safeParse(broken);
      expect(result.success).toBe(false);
    });

    it('fails on invalid locationType', () => {
      const patch = makeValidPatch();
      const broken = {
        ...patch,
        scenes: patch.scenes.map((s) => ({
          ...s,
          heading: { ...s.heading, locationType: 'INDOOR' },
        })),
      };

      const result = writerScenePatchSchema.safeParse(broken);
      expect(result.success).toBe(false);
    });

    it('fails on invalid block type', () => {
      const patch = makeValidPatch();
      const broken = {
        ...patch,
        scenes: [
          {
            ...patch.scenes[0],
            blocks: [{ type: 'song', text: 'invalid type' }],
          },
          ...patch.scenes.slice(1),
        ],
      };

      const result = writerScenePatchSchema.safeParse(broken);
      expect(result.success).toBe(false);
    });

    it('fails when dialogue block is missing characterId', () => {
      const patch = makeValidPatch();
      const broken = {
        ...patch,
        scenes: [
          {
            ...patch.scenes[0],
            blocks: [{ type: 'dialogue', text: 'no character' }],
          },
          ...patch.scenes.slice(1),
        ],
      };

      const result = writerScenePatchSchema.safeParse(broken);
      expect(result.success).toBe(false);
    });
  });
});
