import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema identity
// ---------------------------------------------------------------------------

/** Stable identifier for the Architect response schema. */
export const ADAPTATION_PLAN_SCHEMA_ID = 'adaptation_plan_v1';

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

const sceneCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  dramaticPurpose: z.string(),
  sourceRefs: z.array(sourceRefSchema).min(1),
  pacing: z.enum(['slow', 'balanced', 'fast']),
  estimatedBlocks: z.number().int().positive(),
  writerBrief: z.string(),
  headingSuggestion: sceneHeadingSchema,
});

const adaptationQuestionOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  impact: z.string(),
});

const adaptationQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  whyItMatters: z.string(),
  sourceRefs: z.array(sourceRefSchema).min(1),
  options: z.array(adaptationQuestionOptionSchema).min(1),
  recommendedOptionId: z.string(),
});

const questionAnswerSchema = z.object({
  questionId: z.string(),
  optionId: z.string(),
  source: z.enum(['recommended', 'user']),
});

const adaptationOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  tradeoffs: z.string(),
});

const sourceAnalysisSchema = z.object({
  coreEvents: z.array(z.string()),
  characterArcs: z.array(z.string()),
  timeline: z.array(z.string()),
  mustKeeps: z.array(z.string()),
  compressibleParts: z.array(z.string()),
  exteriorizationNotes: z.array(z.string()),
});

const preferencesSchema = z.object({
  targetMedium: z.enum(['screenplay', 'short_drama', 'visual_novel']),
  targetLength: z.enum([
    'short_scene',
    'short_drama_3_min',
    'ten_scene_outline',
    'episode_outline',
  ]),
  fidelity: z.enum(['faithful', 'core_rewrite', 'free']),
  pacing: z.enum(['slow', 'balanced', 'fast']),
  style: z.enum(['realist', 'suspense', 'light_comedy', 'cold', 'romantic']),
  allowCharacterMerge: z.boolean(),
  allowSubplotCompression: z.boolean(),
  allowTimelineReorder: z.boolean(),
  source: z.enum(['system_default', 'user']),
});

// ---------------------------------------------------------------------------
// Top-level schema
// ---------------------------------------------------------------------------

export const adaptationPlanSchema = z.object({
  id: z.string(),
  preferences: preferencesSchema,
  sourceAnalysis: sourceAnalysisSchema,
  adaptationQuestions: z.array(adaptationQuestionSchema),
  questionAnswers: z.array(questionAnswerSchema),
  adaptationOptions: z.array(adaptationOptionSchema),
  recommendedPlan: z.string(),
  sceneOutline: z.array(sceneCardSchema).min(1),
  characterUpdates: z.array(z.string()),
  risks: z.array(z.string()),
});

export type AdaptationPlanParsed = z.infer<typeof adaptationPlanSchema>;
