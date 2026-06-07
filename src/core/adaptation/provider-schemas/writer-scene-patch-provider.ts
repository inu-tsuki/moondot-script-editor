import { z } from 'zod';

// ---------------------------------------------------------------------------
// Provider-facing Writer scene patch schema
// ---------------------------------------------------------------------------
//
// This schema differs from the app-side `writerScenePatchSchema` in three ways:
//
// 1. **Optional → Nullable**: All `.optional()` fields become `.nullable()`.
//    OpenAI strict structured output requires every field to appear in
//    `required`.  The model must emit `null` when a value is unknown.
//
// 2. **Discriminated union → Flat object**: The app-side `z.discriminatedUnion`
//    generates `oneOf` which strict mode rejects.  The provider schema uses a
//    single flat block object where variant-specific fields are all required
//    + nullable; the `type` enum discriminates which variant applies.
//
// 3. **Removed unsupported constraints**: `.min(1)` on arrays is removed.
//    Non-empty validation stays with `validateWriterScenePatch()`.
//
// A normalizer (`normalizers.ts`) converts provider output back to the
// app-side format before `writerScenePatchSchema.safeParse()`.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const sourceRefSchema = z.object({
  kind: z.literal('chapter'),
  sourceId: z.string(),
});

const sceneHeadingSchema = z.object({
  locationType: z.enum(['INT', 'EXT', 'INT_EXT']),
  location: z.string(),
  timeOfDay: z.string(),
});

/**
 * Provider-facing block schema: flat object with all variant fields.
 *
 * Only the fields matching the `type` value are semantically meaningful;
 * the normalizer drops unrelated nullable fields when reconstructing the
 * discriminated union for the app-side contract.
 */
const providerSceneBlockDraftSchema = z.object({
  type: z.enum(['action', 'dialogue', 'narration', 'transition', 'note']),

  // Shared across all block types
  text: z.string(),
  sourceRefs: z.array(sourceRefSchema).nullable(),

  // Variant-specific — all required + nullable
  characterId: z.string().nullable(), // only for 'dialogue'
  parenthetical: z.string().nullable(), // only for 'dialogue'
  voice: z.enum(['voice_over', 'off_screen', 'narrator']).nullable(), // only for 'narration'
});

const providerSceneDraftSchema = z.object({
  sceneCardId: z.string(),
  title: z.string(),
  synopsis: z.string().nullable(), // nullable required instead of optional
  heading: sceneHeadingSchema,
  sourceRefs: z.array(sourceRefSchema), // no .min(1)
  blocks: z.array(providerSceneBlockDraftSchema), // no .min(1)
});

// ---------------------------------------------------------------------------
// Top-level
// ---------------------------------------------------------------------------

export const writerScenePatchProviderSchema = z.object({
  planId: z.string(),
  scenes: z.array(providerSceneDraftSchema), // no .min(1)
  characterUpdates: z.array(z.string()).nullable(), // nullable instead of optional
});

// ---------------------------------------------------------------------------
// Derived types for the normalizer
// ---------------------------------------------------------------------------

export type ProviderSceneBlockDraft = z.infer<typeof providerSceneBlockDraftSchema>;
export type ProviderSceneDraft = z.infer<typeof providerSceneDraftSchema>;
export type WriterScenePatchProviderOutput = z.infer<typeof writerScenePatchProviderSchema>;
