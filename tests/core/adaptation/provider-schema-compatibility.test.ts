import {
  ADAPTATION_PLAN_SCHEMA_ID,
  WRITER_SCENE_PATCH_SCHEMA_ID,
  adaptationPlanSchema,
  createMockAdaptationPlan,
  createMockWriterScenePatch,
  validateAdaptationPlan,
  validateWriterScenePatch,
  writerScenePatchSchema,
} from '../../../src/core/adaptation';
import {
  parseAndNormalizeProviderOutput,
  resolveProviderSchema,
} from '../../../src/core/adaptation/provider-schemas';
import {
  normalizeArchitectOutput,
  normalizeWriterOutput,
} from '../../../src/core/adaptation/provider-schemas/normalizers';
import type { WriterScenePatchProviderOutput } from '../../../src/core/adaptation/provider-schemas/writer-scene-patch-provider';
import { demoScreenplayDocument } from '../../../src/core/screenplay';
import type {
  AdaptationPlan,
  ScreenplayDocument,
  WriterScenePatch,
} from '../../../src/core/adaptation';

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

const makeValidPatch = (plan: AdaptationPlan): WriterScenePatch => {
  const { patch } = createMockWriterScenePatch(plan, doc);
  return patch;
};

// ---------------------------------------------------------------------------
// Architect roundtrip
// ---------------------------------------------------------------------------

describe('Architect roundtrip', () => {
  it('mock plan passes through normalizer and app-side validation', () => {
    const plan = makeValidPlan();

    const normalized = normalizeArchitectOutput(plan);
    const result = validateAdaptationPlan(normalized, {
      knownChapterIds: new Set(
        (doc.source as { chapters: Array<{ id: string }> }).chapters.map((c) => c.id),
      ),
    });

    expect(result.plan).not.toBeNull();
    expect(result.error).toBeUndefined();
    expect(result.plan?.id).toBe(plan.id);
  });

  it('plan passes app-side Zod parse directly (structure is identical)', () => {
    const plan = makeValidPlan();
    const parsed = adaptationPlanSchema.safeParse(plan);
    expect(parsed.success).toBe(true);
  });

  it('rounds provider estimatedBlocks back to app-side integer contract', () => {
    const plan = makeValidPlan();
    const providerOutput = {
      ...plan,
      sceneOutline: plan.sceneOutline.map((scene, index) => ({
        ...scene,
        estimatedBlocks: index === 0 ? 1.2 : 1.5,
      })),
    };

    const normalized = normalizeArchitectOutput(providerOutput);
    const parsed = adaptationPlanSchema.safeParse(normalized);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sceneOutline.map((scene) => scene.estimatedBlocks)).toEqual([1, 2]);
    }
  });

  it('normalizes provider nullable character fields to app-side optional fields', () => {
    const plan = makeValidPlan();
    const providerOutput = {
      ...plan,
      characters: [
        {
          id: 'char_rick',
          name: '里克',
          aliases: ['德卡德'],
          description: null,
          tags: null,
        },
      ],
    };

    const normalized = normalizeArchitectOutput(providerOutput);
    const parsed = adaptationPlanSchema.safeParse(normalized);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.characters[0]).toEqual({
        id: 'char_rick',
        name: '里克',
        aliases: ['德卡德'],
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Writer roundtrip
// ---------------------------------------------------------------------------

describe('Writer roundtrip', () => {
  it('normalized provider output passes app-side validation', () => {
    const plan = makeValidPlan();
    const patch = makeValidPatch(plan);

    // Convert app-side patch to provider-facing format
    const providerOutput: WriterScenePatchProviderOutput = {
      planId: patch.planId,
      characterUpdates: patch.characterUpdates ?? null,
      scenes: patch.scenes.map((draft) => ({
        sceneCardId: draft.sceneCardId,
        title: draft.title,
        synopsis: draft.synopsis ?? null,
        heading: draft.heading,
        sourceRefs: draft.sourceRefs,
        blocks: draft.blocks.map((block) => ({
          type: block.type,
          text: block.text,
          sourceRefs: block.sourceRefs ?? null,
          characterId:
            block.type === 'dialogue' ? (block as { characterId: string }).characterId : null,
          parenthetical:
            block.type === 'dialogue'
              ? ((block as { parenthetical?: string }).parenthetical ?? null)
              : null,
          voice: block.type === 'narration' ? ((block as { voice?: string }).voice ?? null) : null,
        })),
      })),
    };

    // Normalize back to app-side format
    const normalized = normalizeWriterOutput(providerOutput);

    // App-side Zod structural validation
    const parsed = writerScenePatchSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);

    // App-side semantic validation
    const result = validateWriterScenePatch(normalized, {
      plan,
      knownChapterIds: new Set(
        (doc.source as { chapters: Array<{ id: string }> }).chapters.map((c) => c.id),
      ),
      knownCharacterIds: new Set(doc.characters.map((c) => c.id)),
    });

    expect(result.patch).not.toBeNull();
    expect(result.error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Writer nullable → optional roundtrip
// ---------------------------------------------------------------------------

describe('Writer nullable field handling', () => {
  const plan = makeValidPlan();

  it('synopsis null is omitted in normalized output', () => {
    const providerOutput: WriterScenePatchProviderOutput = {
      planId: plan.id,
      characterUpdates: null,
      scenes: [
        {
          sceneCardId: plan.sceneOutline[0].id,
          title: 'Test Scene',
          synopsis: null, // null → should be omitted
          heading: plan.sceneOutline[0].headingSuggestion,
          sourceRefs: plan.sceneOutline[0].sourceRefs,
          blocks: [
            {
              type: 'action',
              text: 'Test action.',
              sourceRefs: null,
              characterId: null,
              parenthetical: null,
              voice: null,
            },
          ],
        },
      ],
    };

    const normalized = normalizeWriterOutput(providerOutput);
    const parsed = writerScenePatchSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // synopsis should not be present (was null in provider output)
      expect(parsed.data.scenes[0].synopsis).toBeUndefined();
      // characterUpdates should not be present
      expect(parsed.data.characterUpdates).toBeUndefined();
    }
  });

  it('synopsis non-null is preserved in normalized output', () => {
    const providerOutput: WriterScenePatchProviderOutput = {
      planId: plan.id,
      characterUpdates: ['Updated character X'],
      scenes: [
        {
          sceneCardId: plan.sceneOutline[0].id,
          title: 'Test Scene',
          synopsis: 'A tense confrontation.',
          heading: plan.sceneOutline[0].headingSuggestion,
          sourceRefs: plan.sceneOutline[0].sourceRefs,
          blocks: [
            {
              type: 'dialogue',
              text: 'Hello.',
              sourceRefs: null, // null → optional, should be omitted
              characterId: 'char-1',
              parenthetical: '(whispering)',
              voice: null, // unrelated variant field, always null
            },
          ],
        },
      ],
    };

    const normalized = normalizeWriterOutput(providerOutput);
    const parsed = writerScenePatchSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.scenes[0].synopsis).toBe('A tense confrontation.');
      expect(parsed.data.characterUpdates).toEqual(['Updated character X']);
    }
  });

  it('block-level sourceRefs null is omitted', () => {
    const providerOutput: WriterScenePatchProviderOutput = {
      planId: plan.id,
      characterUpdates: null,
      scenes: [
        {
          sceneCardId: plan.sceneOutline[0].id,
          title: 'Test Scene',
          synopsis: null,
          heading: plan.sceneOutline[0].headingSuggestion,
          sourceRefs: plan.sceneOutline[0].sourceRefs,
          blocks: [
            {
              type: 'action',
              text: 'Action without source refs.',
              sourceRefs: null, // should be omitted for app-side optional
              characterId: null,
              parenthetical: null,
              voice: null,
            },
          ],
        },
      ],
    };

    const normalized = normalizeWriterOutput(providerOutput);
    const parsed = writerScenePatchSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // sourceRefs should be absent for this block
      expect(parsed.data.scenes[0].blocks[0].sourceRefs).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Writer block flat → discriminated union reconstruction
// ---------------------------------------------------------------------------

describe('Writer block reconstruction', () => {
  const plan = makeValidPlan();

  const makeProviderScene = (
    blockOverrides: Partial<{
      type: string;
      text: string;
      characterId: string | null;
      parenthetical: string | null;
      voice: string | null;
    }> = {},
  ) => ({
    sceneCardId: plan.sceneOutline[0].id,
    title: 'Reconstruction Test',
    synopsis: null,
    heading: plan.sceneOutline[0].headingSuggestion,
    sourceRefs: plan.sceneOutline[0].sourceRefs,
    blocks: [
      {
        type: blockOverrides.type ?? 'action',
        text: blockOverrides.text ?? 'Block text.',
        sourceRefs: null,
        characterId: blockOverrides.characterId ?? null,
        parenthetical: blockOverrides.parenthetical ?? null,
        voice: blockOverrides.voice ?? null,
      },
    ],
  });

  it('action block: only type + text survive', () => {
    const providerOutput: WriterScenePatchProviderOutput = {
      planId: plan.id,
      characterUpdates: null,
      scenes: [makeProviderScene({ type: 'action' })],
    };

    const normalized = normalizeWriterOutput(providerOutput);
    const parsed = writerScenePatchSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const block = parsed.data.scenes[0].blocks[0];
      expect(block.type).toBe('action');
      expect('characterId' in block).toBe(false);
      expect('parenthetical' in block).toBe(false);
      expect('voice' in block).toBe(false);
    }
  });

  it('dialogue block: characterId + parenthetical survive', () => {
    const providerOutput: WriterScenePatchProviderOutput = {
      planId: plan.id,
      characterUpdates: null,
      scenes: [
        makeProviderScene({
          type: 'dialogue',
          characterId: 'char-1',
          parenthetical: '(sighs)',
        }),
      ],
    };

    const normalized = normalizeWriterOutput(providerOutput);
    const parsed = writerScenePatchSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const block = parsed.data.scenes[0].blocks[0];
      expect(block.type).toBe('dialogue');
      if (block.type === 'dialogue') {
        expect(block.characterId).toBe('char-1');
        expect(block.parenthetical).toBe('(sighs)');
      }
    }
  });

  it('narration block: voice survives when non-null', () => {
    const providerOutput: WriterScenePatchProviderOutput = {
      planId: plan.id,
      characterUpdates: null,
      scenes: [
        makeProviderScene({
          type: 'narration',
          voice: 'voice_over',
        }),
      ],
    };

    const normalized = normalizeWriterOutput(providerOutput);
    const parsed = writerScenePatchSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const block = parsed.data.scenes[0].blocks[0];
      expect(block.type).toBe('narration');
      if (block.type === 'narration') {
        expect(block.voice).toBe('voice_over');
      }
    }
  });

  it('dialogue block with null parenthetical: field is omitted', () => {
    const providerOutput: WriterScenePatchProviderOutput = {
      planId: plan.id,
      characterUpdates: null,
      scenes: [
        makeProviderScene({
          type: 'dialogue',
          characterId: 'char-1',
          parenthetical: null,
        }),
      ],
    };

    const normalized = normalizeWriterOutput(providerOutput);
    const parsed = writerScenePatchSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const block = parsed.data.scenes[0].blocks[0];
      expect(block.type).toBe('dialogue');
      if (block.type === 'dialogue') {
        expect(block.parenthetical).toBeUndefined();
      }
    }
  });

  it('narration block with null voice: field is omitted', () => {
    const providerOutput: WriterScenePatchProviderOutput = {
      planId: plan.id,
      characterUpdates: null,
      scenes: [
        makeProviderScene({
          type: 'narration',
          voice: null,
        }),
      ],
    };

    const normalized = normalizeWriterOutput(providerOutput);
    const parsed = writerScenePatchSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const block = parsed.data.scenes[0].blocks[0];
      expect(block.type).toBe('narration');
      if (block.type === 'narration') {
        expect(block.voice).toBeUndefined();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Full pipeline: mock output → provider → normalizer → app-side validator
// ---------------------------------------------------------------------------

describe('full pipeline', () => {
  it('Architect: mock plan survives the complete roundtrip', () => {
    const plan = makeValidPlan();
    const knownChapterIds = new Set(
      (doc.source as { chapters: Array<{ id: string }> }).chapters.map((c) => c.id),
    );

    // Step 1: app-side Zod parse
    const parsed = adaptationPlanSchema.safeParse(plan);
    expect(parsed.success).toBe(true);

    // Step 2: normalizer (identity for Architect)
    const normalized = normalizeArchitectOutput(plan);

    // Step 3: app-side semantic validation
    const result = validateAdaptationPlan(normalized, { knownChapterIds });
    expect(result.plan).not.toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('Writer: mock patch survives the complete roundtrip', () => {
    const plan = makeValidPlan();
    const patch = makeValidPatch(plan);
    const knownChapterIds = new Set(
      (doc.source as { chapters: Array<{ id: string }> }).chapters.map((c) => c.id),
    );
    const knownCharacterIds = new Set(doc.characters.map((c) => c.id));

    // Step 1: Convert to provider-facing format (simulating what the model returns)
    const providerOutput: WriterScenePatchProviderOutput = {
      planId: patch.planId,
      characterUpdates: patch.characterUpdates ?? null,
      scenes: patch.scenes.map((draft) => ({
        sceneCardId: draft.sceneCardId,
        title: draft.title,
        synopsis: draft.synopsis ?? null,
        heading: draft.heading,
        sourceRefs: draft.sourceRefs,
        blocks: draft.blocks.map((block) => ({
          type: block.type,
          text: block.text,
          sourceRefs: block.sourceRefs ?? null,
          characterId:
            block.type === 'dialogue' ? (block as { characterId: string }).characterId : null,
          parenthetical:
            block.type === 'dialogue'
              ? ((block as { parenthetical?: string }).parenthetical ?? null)
              : null,
          voice: block.type === 'narration' ? ((block as { voice?: string }).voice ?? null) : null,
        })),
      })),
    };

    // Step 2: Normalizer
    const normalized = normalizeWriterOutput(providerOutput);

    // Step 3: App-side Zod structural validation
    const parsed = writerScenePatchSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);

    // Step 4: App-side semantic validation
    const result = validateWriterScenePatch(normalized, {
      plan,
      knownChapterIds,
      knownCharacterIds,
    });
    expect(result.patch).not.toBeNull();
    expect(result.error).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Malformed provider output — parse + normalize guard
// ---------------------------------------------------------------------------

describe('malformed provider output', () => {
  it('parseAndNormalizeProviderOutput returns schema failure for null input', () => {
    const entry = resolveProviderSchema(ADAPTATION_PLAN_SCHEMA_ID)!;
    expect(entry).toBeDefined();

    const result = parseAndNormalizeProviderOutput(entry, null);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('schema');
      expect(result.message).toContain('Provider schema parse failed');
    }
  });

  it('parseAndNormalizeProviderOutput returns schema failure for completely wrong shape', () => {
    const entry = resolveProviderSchema(ADAPTATION_PLAN_SCHEMA_ID)!;
    const result = parseAndNormalizeProviderOutput(entry, { notAField: 42 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('schema');
    }
  });

  it('parseAndNormalizeProviderOutput returns schema failure for Writer with missing required fields', () => {
    const entry = resolveProviderSchema(WRITER_SCENE_PATCH_SCHEMA_ID)!;
    const result = parseAndNormalizeProviderOutput(entry, {
      planId: 'some-plan',
      // scenes is required and missing
      characterUpdates: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('schema');
    }
  });

  it('parseAndNormalizeProviderOutput does NOT throw on deeply malformed input', () => {
    // The key property: normalizeWriterOutput casts and accesses .scenes.map()
    // on whatever is given.  parseAndNormalizeProviderOutput must guard this.
    const entry = resolveProviderSchema(WRITER_SCENE_PATCH_SCHEMA_ID)!;

    // This would throw TypeError if passed directly to the bare normalizer
    const malicious = {
      planId: 'x',
      scenes: null, // not an array — bare normalizer would crash on .map()
    };

    const result = parseAndNormalizeProviderOutput(entry, malicious);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.reason).toBe('schema');
    }
  });

  it('parseAndNormalizeProviderOutput succeeds with valid Architect data', () => {
    const plan = makeValidPlan();
    const entry = resolveProviderSchema(ADAPTATION_PLAN_SCHEMA_ID)!;

    const result = parseAndNormalizeProviderOutput(entry, plan);
    expect(result.success).toBe(true);
    if (result.success) {
      // Normalized output should pass app-side validation
      const validated = validateAdaptationPlan(result.normalized, {
        knownChapterIds: new Set(
          (doc.source as { chapters: Array<{ id: string }> }).chapters.map((c) => c.id),
        ),
      });
      expect(validated.plan).not.toBeNull();
      expect(validated.error).toBeUndefined();
    }
  });
});
