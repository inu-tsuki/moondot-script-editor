import type { ModelCallError, ModelCallErrorReason } from '../model';
import type { Diagnostic } from '../validation';
import type { AdaptationPlan } from './types';
import type { WriterScenePatch } from './types';
import { writerScenePatchSchema } from './writer-scene-patch-schema';

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type ValidateWriterScenePatchResult = {
  patch: WriterScenePatch | null;
  diagnostics: Diagnostic[];
  /** Populated on schema or semantic failure. */
  error?: ModelCallError;
};

export type ValidateWriterScenePatchOptions = {
  /** The confirmed AdaptationPlan the Writer is drafting from. */
  plan: AdaptationPlan;
  /** Known chapter IDs from the source document. */
  knownChapterIds: Set<string>;
  /** Known character IDs from the document roster. */
  knownCharacterIds: Set<string>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const diag = (
  severity: Diagnostic['severity'],
  code: string,
  message: string,
  path: string,
): Diagnostic => ({ severity, code, message, path });

const fail = (
  reason: ModelCallErrorReason,
  diagnostics: Diagnostic[],
  message: string,
): ValidateWriterScenePatchResult => ({
  patch: null,
  diagnostics,
  error: { reason, message },
});

// ---------------------------------------------------------------------------
// Zod error → diagnostics
// ---------------------------------------------------------------------------

const zodIssuesToDiagnostics = (
  issues: ReadonlyArray<{ code: string; message: string; path: PropertyKey[] }>,
): Diagnostic[] =>
  issues.map((issue) =>
    diag(
      'error',
      `zod_${issue.code}`,
      issue.message,
      `writerScenePatch.${issue.path.map(String).join('.')}`,
    ),
  );

// ---------------------------------------------------------------------------
// Semantic checks (post-Zod, depend on runtime data)
// ---------------------------------------------------------------------------

/**
 * Check that a sourceRef's sourceId exists in knownChapterIds.
 * Used at both scene-level and block-level.
 */
const validateChapterSourceRef = (sourceId: string, knownChapterIds: Set<string>): boolean =>
  knownChapterIds.has(sourceId);

const runSemanticChecks = (
  patch: WriterScenePatch,
  options: ValidateWriterScenePatchOptions,
): ValidateWriterScenePatchResult | null => {
  // -- planId must match the current plan --
  if (patch.planId !== options.plan.id) {
    return fail(
      'semantic',
      [
        diag(
          'error',
          'plan_id_mismatch',
          `WriterScenePatch.planId "${patch.planId}" does not match the current AdaptationPlan.id "${options.plan.id}".`,
          'writerScenePatch.planId',
        ),
      ],
      `WriterScenePatch references unknown plan "${patch.planId}".`,
    );
  }

  // -- Build plan sceneCardId set --
  const planSceneCardIds = new Set(options.plan.sceneOutline.map((card) => card.id));

  // -- sceneCardId coverage: exact set match against plan --
  const patchSceneCardIds = new Set<string>();
  for (let i = 0; i < patch.scenes.length; i++) {
    const sceneCardId = patch.scenes[i].sceneCardId;

    // -- sceneCardId must exist in plan.sceneOutline --
    if (!planSceneCardIds.has(sceneCardId)) {
      return fail(
        'semantic',
        [
          diag(
            'error',
            'unknown_scene_card_id',
            `SceneDraft[${i}].sceneCardId "${sceneCardId}" does not match any SceneCard in the plan.`,
            `writerScenePatch.scenes[${i}].sceneCardId`,
          ),
        ],
        `SceneDraft[${i}] references unknown scene card "${sceneCardId}".`,
      );
    }

    // -- duplicate sceneCardId --
    if (patchSceneCardIds.has(sceneCardId)) {
      return fail(
        'semantic',
        [
          diag(
            'error',
            'duplicate_scene_card_id',
            `SceneDraft[${i}].sceneCardId "${sceneCardId}" appears more than once in the patch.`,
            `writerScenePatch.scenes[${i}].sceneCardId`,
          ),
        ],
        `Duplicate sceneCardId "${sceneCardId}" in Writer patch.`,
      );
    }
    patchSceneCardIds.add(sceneCardId);
  }

  // -- missing sceneCardIds: plan has cards not covered by patch --
  for (const planCardId of planSceneCardIds) {
    if (!patchSceneCardIds.has(planCardId)) {
      return fail(
        'semantic',
        [
          diag(
            'error',
            'missing_scene_card_draft',
            `SceneCard "${planCardId}" from the plan has no corresponding SceneDraft in the Writer patch.`,
            'writerScenePatch.scenes',
          ),
        ],
        `Writer patch is missing draft for scene card "${planCardId}".`,
      );
    }
  }

  // -- Validate each scene draft --
  for (let i = 0; i < patch.scenes.length; i++) {
    const draft = patch.scenes[i];

    // -- scene-level sourceRefs must reference known chapters --
    for (let j = 0; j < draft.sourceRefs.length; j++) {
      const sourceId = draft.sourceRefs[j].sourceId;
      if (!validateChapterSourceRef(sourceId, options.knownChapterIds)) {
        return fail(
          'semantic',
          [
            diag(
              'error',
              'unknown_source_ref',
              `SceneDraft "${draft.sceneCardId}" scene-level sourceRefs[${j}] references unknown chapter: ${sourceId}`,
              `writerScenePatch.scenes[${i}].sourceRefs[${j}].sourceId`,
            ),
          ],
          `SceneDraft "${draft.sceneCardId}" references unknown chapter: ${sourceId}`,
        );
      }
    }

    // -- block-level sourceRefs must also reference known chapters --
    for (let k = 0; k < draft.blocks.length; k++) {
      const block = draft.blocks[k];

      // -- dialogue block characterId must reference known characters --
      if (block.type === 'dialogue' && !options.knownCharacterIds.has(block.characterId)) {
        return fail(
          'semantic',
          [
            diag(
              'error',
              'unknown_character_ref',
              `SceneDraft "${draft.sceneCardId}" block[${k}] references unknown character: "${block.characterId}".`,
              `writerScenePatch.scenes[${i}].blocks[${k}].characterId`,
            ),
          ],
          `SceneDraft "${draft.sceneCardId}" references unknown character "${block.characterId}".`,
        );
      }

      if (block.sourceRefs) {
        for (let m = 0; m < block.sourceRefs.length; m++) {
          const sourceId = block.sourceRefs[m].sourceId;
          if (!validateChapterSourceRef(sourceId, options.knownChapterIds)) {
            return fail(
              'semantic',
              [
                diag(
                  'error',
                  'unknown_source_ref',
                  `SceneDraft "${draft.sceneCardId}" block[${k}].sourceRefs[${m}] references unknown chapter: ${sourceId}`,
                  `writerScenePatch.scenes[${i}].blocks[${k}].sourceRefs[${m}].sourceId`,
                ),
              ],
              `SceneDraft "${draft.sceneCardId}" block[${k}] references unknown chapter: ${sourceId}`,
            );
          }
        }
      }
    }
  }

  return null;
};

// ---------------------------------------------------------------------------
// Main validator
// ---------------------------------------------------------------------------

export const validateWriterScenePatch = (
  candidate: unknown,
  options: ValidateWriterScenePatchOptions,
): ValidateWriterScenePatchResult => {
  // -- Zod structural validation --
  const parsed = writerScenePatchSchema.safeParse(candidate);
  if (!parsed.success) {
    return fail(
      'schema',
      zodIssuesToDiagnostics(parsed.error.issues),
      'Writer scene patch does not match the required schema.',
    );
  }

  const patch = parsed.data as WriterScenePatch;

  // -- Semantic checks --
  const semanticErr = runSemanticChecks(patch, options);
  if (semanticErr) return semanticErr;

  return { patch, diagnostics: [] };
};
