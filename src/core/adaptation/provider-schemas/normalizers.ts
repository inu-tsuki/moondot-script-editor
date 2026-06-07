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
 * Architect provider normalizer — currently identity.
 *
 * The Architect provider schema mirrors the app-side schema exactly (only
 * `minItems` and numeric constraints were dropped by the provider schema,
 * and those are structural additions — the output shape is the same).
 *
 * If a future model introduces structural drift (e.g. `const` vs `enum`
 * differences), add mapping here.
 */
export const normalizeArchitectOutput = (providerOutput: unknown): unknown => providerOutput;

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
