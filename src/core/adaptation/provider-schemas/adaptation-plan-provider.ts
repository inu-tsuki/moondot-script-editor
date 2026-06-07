import { z } from 'zod';

// ---------------------------------------------------------------------------
// Provider-facing Architect schema
// ---------------------------------------------------------------------------
//
// This schema mirrors `adaptationPlanSchema` but removes Zod constraints
// that generate unsupported JSON Schema keywords under OpenAI strict mode:
//
//   - `.min(1)` on arrays  → generates `minItems` (unsupported)
//   - `.int().positive()`   → generates `exclusiveMinimum` / `maximum` (unsupported)
//
// All structural validation (non-empty arrays, positive integers, etc.) is
// handled by `validateAdaptationPlan()` in the app-side layer.
//
// This schema exists because we cannot pass the app-side schema directly
// to `zodTextFormat()` — the unsupported keywords would be generated.
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
  sourceRefs: z.array(sourceRefSchema), // no .min(1)
  pacing: z.enum(['slow', 'balanced', 'fast']),
  estimatedBlocks: z.number(), // no .int() or .positive() — app-side validates
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
  sourceRefs: z.array(sourceRefSchema), // no .min(1)
  options: z.array(adaptationQuestionOptionSchema), // no .min(1)
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

const characterProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()),
  description: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
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
// Top-level
// ---------------------------------------------------------------------------

export const adaptationPlanProviderSchema = z.object({
  id: z.string(),
  preferences: preferencesSchema,
  sourceAnalysis: sourceAnalysisSchema,
  characters: z.array(characterProfileSchema),
  adaptationQuestions: z.array(adaptationQuestionSchema), // no .min(1) — app-side validates
  questionAnswers: z.array(questionAnswerSchema),
  adaptationOptions: z.array(adaptationOptionSchema),
  recommendedPlan: z.string(),
  sceneOutline: z.array(sceneCardSchema), // no .min(1) — app-side validates
  characterUpdates: z.array(z.string()),
  risks: z.array(z.string()),
});
