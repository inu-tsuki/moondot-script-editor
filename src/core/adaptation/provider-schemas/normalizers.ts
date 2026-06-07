import type {
  ProviderSceneBlockDraft,
  ProviderSceneDraft,
  WriterScenePatchProviderOutput,
} from './writer-scene-patch-provider';

// ---------------------------------------------------------------------------
// Normalizers: convert provider output → app-side Zod safeParse compatible
// ---------------------------------------------------------------------------
//
// The provider-facing schemas use required + nullable fields and flat block
// objects to stay within OpenAI strict structured output constraints.
//
// These normalizers reverse those transformations so the output can be
// fed into the app-side `safeParse` + semantic validators unchanged.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a provider flat block back to the app-side discriminated union
 * shape expected by `sceneBlockDraftSchema` in `writer-scene-patch-schema.ts`.
 */
const normalizeBlock = (block: ProviderSceneBlockDraft): Record<string, unknown> => {
  // Fields common to all block types
  const base: Record<string, unknown> = {
    type: block.type,
    text: block.text,
  };

  // sourceRefs — optional in app-side, so omit when null
  if (block.sourceRefs !== null) {
    base.sourceRefs = block.sourceRefs;
  }

  // Variant-specific fields
  switch (block.type) {
    case 'action':
    case 'transition':
    case 'note':
      // No additional fields — done
      break;

    case 'dialogue':
      // characterId is always required for dialogue in app-side contract
      base.characterId = block.characterId;
      // parenthetical is optional in app-side
      if (block.parenthetical !== null) {
        base.parenthetical = block.parenthetical;
      }
      break;

    case 'narration':
      // voice is optional in app-side
      if (block.voice !== null) {
        base.voice = block.voice;
      }
      break;
  }

  return base;
};

const normalizeSceneDraft = (draft: ProviderSceneDraft): Record<string, unknown> => {
  const result: Record<string, unknown> = {
    sceneCardId: draft.sceneCardId,
    title: draft.title,
    heading: draft.heading,
    sourceRefs: draft.sourceRefs,
    blocks: draft.blocks.map(normalizeBlock),
  };

  // synopsis is optional in app-side — only include when non-null
  if (draft.synopsis !== null) {
    result.synopsis = draft.synopsis;
  }

  return result;
};

// ---------------------------------------------------------------------------
// Exported normalizers
// ---------------------------------------------------------------------------

/**
 * Architect provider normalizer.
 *
 * The provider schema intentionally relaxes some app-side structural
 * constraints (for example `.int().positive()` on `estimatedBlocks`) to stay
 * inside the OpenAI strict structured output subset.  Normalize those fields
 * back to the app-side contract before final validation.
 */
export const normalizeArchitectOutput = (providerOutput: unknown): unknown => {
  if (providerOutput === null || typeof providerOutput !== 'object') return providerOutput;

  const out = providerOutput as Record<string, unknown>;

  return {
    ...out,
    ...(Array.isArray(out.characters)
      ? {
          characters: out.characters.map((character) => {
            if (character === null || typeof character !== 'object') return character;
            const characterRecord = character as Record<string, unknown>;
            return {
              ...characterRecord,
              ...(characterRecord.description === null ? { description: undefined } : {}),
              ...(characterRecord.tags === null ? { tags: undefined } : {}),
            };
          }),
        }
      : {}),
    ...(Array.isArray(out.sceneOutline)
      ? {
          sceneOutline: out.sceneOutline.map((scene) => {
            if (scene === null || typeof scene !== 'object') return scene;
            const sceneRecord = scene as Record<string, unknown>;
            const estimatedBlocks = sceneRecord.estimatedBlocks;
            if (typeof estimatedBlocks !== 'number' || !Number.isFinite(estimatedBlocks)) {
              return scene;
            }

            return {
              ...sceneRecord,
              estimatedBlocks: Math.max(1, Math.round(estimatedBlocks)),
            };
          }),
        }
      : {}),
  };
};

/**
 * Writer provider normalizer.
 *
 * Transforms provider-side flat blocks back into discriminated union form
 * and drops nullable fields that are `null` so that app-side `.optional()`
 * Zod fields parse correctly.
 */
export const normalizeWriterOutput = (providerOutput: unknown): unknown => {
  const out = providerOutput as WriterScenePatchProviderOutput;
  const result: Record<string, unknown> = {
    planId: out.planId,
    scenes: out.scenes.map(normalizeSceneDraft),
  };

  // characterUpdates is optional in app-side
  if (out.characterUpdates !== null) {
    result.characterUpdates = out.characterUpdates;
  }

  return result;
};
