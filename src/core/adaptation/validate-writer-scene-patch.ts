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

const runSemanticChecks = (
  patch: WriterScenePatch,
  options: ValidateWriterScenePatchOptions,
  diagnostics: Diagnostic[],
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

  // -- Validate each scene draft --
  for (let i = 0; i < patch.scenes.length; i++) {
    const draft = patch.scenes[i];

    // -- sceneCardId must exist in plan.sceneOutline --
    if (!planSceneCardIds.has(draft.sceneCardId)) {
      return fail(
        'semantic',
        [
          diag(
            'error',
            'unknown_scene_card_id',
            `SceneDraft[${i}].sceneCardId "${draft.sceneCardId}" does not match any SceneCard in the plan.`,
            `writerScenePatch.scenes[${i}].sceneCardId`,
          ),
        ],
        `SceneDraft[${i}] references unknown scene card "${draft.sceneCardId}".`,
      );
    }

    // -- sourceRefs must reference known chapters --
    for (let j = 0; j < draft.sourceRefs.length; j++) {
      const sourceId = draft.sourceRefs[j].sourceId;
      if (!options.knownChapterIds.has(sourceId)) {
        return fail(
          'semantic',
          [
            diag(
              'error',
              'unknown_source_ref',
              `SceneDraft "${draft.sceneCardId}" references unknown chapter: ${sourceId}`,
              `writerScenePatch.scenes[${i}].sourceRefs[${j}].sourceId`,
            ),
          ],
          `SceneDraft "${draft.sceneCardId}" references unknown chapter: ${sourceId}`,
        );
      }
    }

    // -- dialogue block characterId should reference known characters --
    for (let k = 0; k < draft.blocks.length; k++) {
      const block = draft.blocks[k];
      if (block.type === 'dialogue' && !options.knownCharacterIds.has(block.characterId)) {
        diagnostics.push(
          diag(
            'warning',
            'unknown_character_ref',
            `SceneDraft "${draft.sceneCardId}" block[${k}] references unknown character: "${block.characterId}".`,
            `writerScenePatch.scenes[${i}].blocks[${k}].characterId`,
          ),
        );
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
  const diagnostics: Diagnostic[] = [];

  // -- Semantic checks --
  const semanticErr = runSemanticChecks(patch, options, diagnostics);
  if (semanticErr) return semanticErr;

  return { patch, diagnostics };
};
