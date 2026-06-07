import type { ModelCallError, ModelCallErrorReason } from '../model';
import type { Diagnostic } from '../validation';
import { adaptationPlanSchema } from './adaptation-plan-schema';
import type { AdaptationPlan } from './types';

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type ValidateAdaptationPlanResult = {
  plan: AdaptationPlan | null;
  diagnostics: Diagnostic[];
  /** Populated on schema or semantic failure. */
  error?: ModelCallError;
};

export type ValidateAdaptationPlanOptions = {
  /** Known chapter IDs from the source document. */
  knownChapterIds: Set<string>;
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
): ValidateAdaptationPlanResult => ({
  plan: null,
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
      `adaptationPlan.${issue.path.map(String).join('.')}`,
    ),
  );

// ---------------------------------------------------------------------------
// Semantic checks (post-Zod, depend on runtime data)
// ---------------------------------------------------------------------------

const runSemanticChecks = (
  plan: AdaptationPlan,
  options: ValidateAdaptationPlanOptions,
  diagnostics: Diagnostic[],
): ValidateAdaptationPlanResult | null => {
  // -- sceneOutline[].id must be unique --
  const seenSceneCardIds = new Set<string>();
  for (let i = 0; i < plan.sceneOutline.length; i++) {
    const cardId = plan.sceneOutline[i].id;
    if (seenSceneCardIds.has(cardId)) {
      return fail(
        'semantic',
        [
          diag(
            'error',
            'duplicate_scene_card_id',
            `sceneOutline[${i}].id "${cardId}" is not unique. Writer coverage validation depends on stable sceneCardId keys.`,
            `adaptationPlan.sceneOutline[${i}].id`,
          ),
        ],
        `Duplicate sceneOutline id: "${cardId}".`,
      );
    }
    seenSceneCardIds.add(cardId);
  }

  // -- sourceRefs must reference known chapters --
  for (let i = 0; i < plan.sceneOutline.length; i++) {
    const card = plan.sceneOutline[i];
    for (let j = 0; j < card.sourceRefs.length; j++) {
      const sourceId = card.sourceRefs[j].sourceId;
      if (!options.knownChapterIds.has(sourceId)) {
        return fail(
          'semantic',
          [
            diag(
              'error',
              'unknown_source_ref',
              `SceneCard "${card.title}" references unknown chapter: ${sourceId}`,
              `adaptationPlan.sceneOutline[${i}].sourceRefs[${j}].sourceId`,
            ),
          ],
          `SceneCard "${card.title}" references unknown chapter: ${sourceId}`,
        );
      }
    }
  }

  for (let i = 0; i < plan.adaptationQuestions.length; i++) {
    const q = plan.adaptationQuestions[i];
    for (let j = 0; j < q.sourceRefs.length; j++) {
      const sourceId = q.sourceRefs[j].sourceId;
      if (!options.knownChapterIds.has(sourceId)) {
        return fail(
          'semantic',
          [
            diag(
              'error',
              'unknown_source_ref',
              `AdaptationQuestion "${q.id}" references unknown chapter: ${sourceId}`,
              `adaptationPlan.adaptationQuestions[${i}].sourceRefs[${j}].sourceId`,
            ),
          ],
          `AdaptationQuestion "${q.id}" references unknown chapter: ${sourceId}`,
        );
      }
    }
  }

  // -- question / answer reference integrity --
  const questionMap = new Map<string, { optionIds: Set<string>; recommended: string }>();
  for (const q of plan.adaptationQuestions) {
    const optionIds = new Set(q.options.map((o) => o.id));
    questionMap.set(q.id, { optionIds, recommended: q.recommendedOptionId });

    if (!optionIds.has(q.recommendedOptionId)) {
      return fail(
        'semantic',
        [
          diag(
            'error',
            'invalid_recommended_option',
            `recommendedOptionId "${q.recommendedOptionId}" does not match any option in question "${q.id}".`,
            `adaptationPlan.adaptationQuestions.${q.id}.recommendedOptionId`,
          ),
        ],
        `recommendedOptionId "${q.recommendedOptionId}" not found in question "${q.id}" options.`,
      );
    }
  }

  for (let i = 0; i < plan.questionAnswers.length; i++) {
    const ans = plan.questionAnswers[i];
    const qEntry = questionMap.get(ans.questionId);
    if (!qEntry) {
      return fail(
        'semantic',
        [
          diag(
            'error',
            'unknown_question_ref',
            `questionAnswers[${i}].questionId "${ans.questionId}" does not match any adaptationQuestion id.`,
            `adaptationPlan.questionAnswers[${i}].questionId`,
          ),
        ],
        `questionAnswers[${i}] references unknown question "${ans.questionId}".`,
      );
    }
    if (!qEntry.optionIds.has(ans.optionId)) {
      return fail(
        'semantic',
        [
          diag(
            'error',
            'unknown_option_ref',
            `questionAnswers[${i}].optionId "${ans.optionId}" not found in question "${ans.questionId}".`,
            `adaptationPlan.questionAnswers[${i}].optionId`,
          ),
        ],
        `questionAnswers[${i}] references unknown option "${ans.optionId}".`,
      );
    }
  }

  // -- cross-chapter scene warning (non-fatal) --
  const hasCrossChapter = plan.sceneOutline.some((card) => card.sourceRefs.length >= 2);
  if (!hasCrossChapter && plan.sceneOutline.length > 0) {
    diagnostics.push(
      diag(
        'warning',
        'no_cross_chapter_scene',
        'No scene card references multiple chapters. Cross-chapter merging is recommended for screenplay adaptation.',
        'adaptationPlan.sceneOutline',
      ),
    );
  }

  return null;
};

// ---------------------------------------------------------------------------
// Main validator
// ---------------------------------------------------------------------------

export const validateAdaptationPlan = (
  candidate: unknown,
  options: ValidateAdaptationPlanOptions,
): ValidateAdaptationPlanResult => {
  // -- Zod structural validation --
  const parsed = adaptationPlanSchema.safeParse(candidate);
  if (!parsed.success) {
    return fail(
      'schema',
      zodIssuesToDiagnostics(parsed.error.issues),
      'Adaptation plan does not match the required schema.',
    );
  }

  const plan = parsed.data as AdaptationPlan;
  const diagnostics: Diagnostic[] = [];

  // -- Semantic checks --
  const semanticErr = runSemanticChecks(plan, options, diagnostics);
  if (semanticErr) return semanticErr;

  return { plan, diagnostics };
};
