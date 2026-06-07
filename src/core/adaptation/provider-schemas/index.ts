import type { ZodObject, z } from 'zod';
import { ADAPTATION_PLAN_SCHEMA_ID } from '../adaptation-plan-schema';
import { WRITER_SCENE_PATCH_SCHEMA_ID } from '../writer-scene-patch-schema';
import { adaptationPlanProviderSchema } from './adaptation-plan-provider';
import { normalizeArchitectOutput, normalizeWriterOutput } from './normalizers';
import { writerScenePatchProviderSchema } from './writer-scene-patch-provider';

// ---------------------------------------------------------------------------
// Registry types
// ---------------------------------------------------------------------------

export type ProviderSchemaEntry = {
  /** Matches `ModelCallRequest.structuredOutput.schemaId`. */
  schemaId: string;
  /** Provider-facing Zod schema to pass to `zodResponseFormat()`. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providerSchema: ZodObject<any>;
  /** Human-readable name for the `zodResponseFormat` second argument. */
  formatName: string;
  /**
   * Normalizer that converts raw provider output into a shape compatible
   * with the app-side `safeParse` / semantic validator.
   */
  normalizer: (providerOutput: unknown) => unknown;
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const PROVIDER_SCHEMA_REGISTRY: Record<string, ProviderSchemaEntry> = {
  [ADAPTATION_PLAN_SCHEMA_ID]: {
    schemaId: ADAPTATION_PLAN_SCHEMA_ID,
    providerSchema: adaptationPlanProviderSchema as unknown as ZodObject<z.ZodRawShape>,
    formatName: 'adaptation_plan',
    normalizer: normalizeArchitectOutput,
  },
  [WRITER_SCENE_PATCH_SCHEMA_ID]: {
    schemaId: WRITER_SCENE_PATCH_SCHEMA_ID,
    providerSchema: writerScenePatchProviderSchema as unknown as ZodObject<z.ZodRawShape>,
    formatName: 'writer_scene_patch',
    normalizer: normalizeWriterOutput,
  },
};

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export const resolveProviderSchema = (schemaId: string): ProviderSchemaEntry | undefined =>
  PROVIDER_SCHEMA_REGISTRY[schemaId];

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------

export { adaptationPlanProviderSchema } from './adaptation-plan-provider';
export { writerScenePatchProviderSchema } from './writer-scene-patch-provider';
export type { WriterScenePatchProviderOutput } from './writer-scene-patch-provider';
export { normalizeArchitectOutput, normalizeWriterOutput } from './normalizers';
