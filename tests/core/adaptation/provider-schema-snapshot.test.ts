import { describe, expect, it } from 'vitest';
import { zodResponseFormat } from 'openai/helpers/zod';
import { adaptationPlanProviderSchema } from '../../../src/core/adaptation/provider-schemas/adaptation-plan-provider';
import { writerScenePatchProviderSchema } from '../../../src/core/adaptation/provider-schemas/writer-scene-patch-provider';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the generated JSON Schema from zodResponseFormat output.
 *
 * `zodResponseFormat` returns `AutoParseableResponseFormat` which extends
 * `ResponseFormatJSONSchema`.  The actual JSON Schema lives under
 * `json_schema.schema`.
 */
const getProviderJsonSchema = (zodSchema: unknown, name: string): Record<string, unknown> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fmt = zodResponseFormat(zodSchema as any, name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schema = (fmt as any).json_schema?.schema;
  if (!schema) {
    throw new Error(`zodResponseFormat returned no json_schema.schema for ${name}`);
  }
  return schema as Record<string, unknown>;
};

/**
 * Recursively collect all values for a given key within a JSON Schema.
 * Useful for auditing specific keywords across nested structures.
 */
const collectValues = (schema: Record<string, unknown>, key: string): Set<unknown> => {
  const results = new Set<unknown>();

  const walk = (node: unknown): void => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (key in obj) {
        results.add(obj[key]);
      }
      Object.values(obj).forEach(walk);
    }
  };

  walk(schema);
  return results;
};

/**
 * List of JSON Schema keywords NOT supported by OpenAI strict structured output.
 * @see https://platform.openai.com/docs/guides/structured-outputs
 */
const UNSUPPORTED_KEYWORDS = [
  'oneOf',
  'allOf',
  '$ref',
  '$defs',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minLength',
  'maxLength',
  'pattern',
  'minItems',
  'maxItems',
];

// ---------------------------------------------------------------------------
// Snapshot tests
// ---------------------------------------------------------------------------

describe('provider-facing JSON Schema snapshots', () => {
  it('generates the Architect provider schema', () => {
    const schema = getProviderJsonSchema(adaptationPlanProviderSchema, 'adaptation_plan');
    expect(schema).toMatchSnapshot('architect-provider-schema');
  });

  it('generates the Writer provider schema', () => {
    const schema = getProviderJsonSchema(writerScenePatchProviderSchema, 'writer_scene_patch');
    expect(schema).toMatchSnapshot('writer-provider-schema');
  });
});

// ---------------------------------------------------------------------------
// Strict mode compatibility assertions
// ---------------------------------------------------------------------------

describe('strict mode compatibility', () => {
  describe('Architect provider schema', () => {
    const schema = getProviderJsonSchema(adaptationPlanProviderSchema, 'adaptation_plan');

    it('root type is object', () => {
      expect(schema.type).toBe('object');
    });

    it('root has additionalProperties: false', () => {
      expect(schema.additionalProperties).toBe(false);
    });

    it('all nested objects have additionalProperties: false', () => {
      const values = collectValues(schema, 'additionalProperties');
      expect(values.size).toBeGreaterThan(0);
      for (const v of values) {
        expect(v).toBe(false);
      }
    });

    it('contains no unsupported JSON Schema keywords', () => {
      for (const kw of UNSUPPORTED_KEYWORDS) {
        const found = collectValues(schema, kw);
        if (found.size > 0) {
          // Print for diagnostics
          console.error(
            `Architect schema contains unsupported keyword: ${kw}=${[...found].join(', ')}`,
          );
        }
        expect(found.size).toBe(0);
      }
    });
  });

  describe('Writer provider schema', () => {
    const schema = getProviderJsonSchema(writerScenePatchProviderSchema, 'writer_scene_patch');

    it('root type is object', () => {
      expect(schema.type).toBe('object');
    });

    it('root has additionalProperties: false', () => {
      expect(schema.additionalProperties).toBe(false);
    });

    it('all nested objects have additionalProperties: false', () => {
      const values = collectValues(schema, 'additionalProperties');
      expect(values.size).toBeGreaterThan(0);
      for (const v of values) {
        expect(v).toBe(false);
      }
    });

    it('contains no unsupported JSON Schema keywords', () => {
      for (const kw of UNSUPPORTED_KEYWORDS) {
        const found = collectValues(schema, kw);
        if (found.size > 0) {
          console.error(
            `Writer schema contains unsupported keyword: ${kw}=${[...found].join(', ')}`,
          );
        }
        expect(found.size).toBe(0);
      }
    });

    it('block type is flat (not a discriminated union / oneOf)', () => {
      // The provider block schema must use flat enum, not oneOf
      const oneOfCount = collectValues(schema, 'oneOf').size;
      expect(oneOfCount).toBe(0);
    });
  });
});
