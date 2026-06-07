import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema identity
// ---------------------------------------------------------------------------

/** Stable identifier for the Writer scene patch response schema. */
export const WRITER_SCENE_PATCH_SCHEMA_ID = 'writer_scene_patch_v1';

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

const sceneBlockDraftSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('action'),
    text: z.string(),
    sourceRefs: z.array(sourceRefSchema).optional(),
  }),
  z.object({
    type: z.literal('dialogue'),
    characterId: z.string(),
    parenthetical: z.string().optional(),
    text: z.string(),
    sourceRefs: z.array(sourceRefSchema).optional(),
  }),
  z.object({
    type: z.literal('narration'),
    voice: z.enum(['voice_over', 'off_screen', 'narrator']).optional(),
    text: z.string(),
    sourceRefs: z.array(sourceRefSchema).optional(),
  }),
  z.object({
    type: z.literal('transition'),
    text: z.string(),
    sourceRefs: z.array(sourceRefSchema).optional(),
  }),
  z.object({
    type: z.literal('note'),
    text: z.string(),
    sourceRefs: z.array(sourceRefSchema).optional(),
  }),
]);

const sceneDraftSchema = z.object({
  sceneCardId: z.string(),
  title: z.string(),
  synopsis: z.string().optional(),
  heading: sceneHeadingSchema,
  sourceRefs: z.array(sourceRefSchema).min(1),
  blocks: z.array(sceneBlockDraftSchema).min(1),
});

// ---------------------------------------------------------------------------
// Top-level schema
// ---------------------------------------------------------------------------

export const writerScenePatchSchema = z.object({
  planId: z.string(),
  scenes: z.array(sceneDraftSchema).min(1),
  characterUpdates: z.array(z.string()).optional(),
});

export type WriterScenePatchParsed = z.infer<typeof writerScenePatchSchema>;
