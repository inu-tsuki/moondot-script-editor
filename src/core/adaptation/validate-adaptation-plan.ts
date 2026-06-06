import type { ModelCallError, ModelCallErrorReason } from '../model';
import type { Diagnostic } from '../validation';
import type { AdaptationPlan, SourceAnalysis } from './types';

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

const diag = (code: string, message: string, path: string): Diagnostic => ({
  severity: 'error',
  code,
  message,
  path,
});

const fail = (
  reason: ModelCallErrorReason,
  code: string,
  message: string,
  path: string,
): ValidateAdaptationPlanResult => ({
  plan: null,
  diagnostics: [diag(code, message, path)],
  error: { reason, message },
});

const schemaFail = (code: string, message: string, path: string) =>
  fail('schema', code, message, path);

const semanticFail = (code: string, message: string, path: string) =>
  fail('semantic', code, message, path);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const ensureArray = (value: unknown, field: string, path: string) => {
  if (!Array.isArray(value)) {
    return schemaFail(
      'invalid_adaptation_plan_field',
      `${field} must be an array.`,
      `${path}.${field}`,
    );
  }
  return null;
};

const ensureString = (value: unknown, field: string, path: string) => {
  if (typeof value !== 'string') {
    return schemaFail(
      'invalid_adaptation_plan_field',
      `${field} must be a string.`,
      `${path}.${field}`,
    );
  }
  return null;
};

const ensureObject = (value: unknown, field: string, path: string) => {
  if (!isObject(value)) {
    return schemaFail(
      'invalid_adaptation_plan_field',
      `${field} must be an object.`,
      `${path}.${field}`,
    );
  }
  return null;
};

// ---------------------------------------------------------------------------
// Sub-validators
// ---------------------------------------------------------------------------

const validateSourceAnalysis = (
  candidate: unknown,
  path: string,
): ValidateAdaptationPlanResult | null => {
  const err = ensureObject(candidate, 'sourceAnalysis', path);
  if (err) return err;

  const obj = candidate as Record<string, unknown>;
  const arrayFields: (keyof SourceAnalysis)[] = [
    'coreEvents',
    'characterArcs',
    'timeline',
    'mustKeeps',
    'compressibleParts',
    'exteriorizationNotes',
  ];

  for (const field of arrayFields) {
    if (!isStringArray(obj[field])) {
      return schemaFail(
        'invalid_source_analysis_field',
        `sourceAnalysis.${field} must be a string array.`,
        `${path}.${field}`,
      );
    }
  }

  return null;
};

const validateSceneCard = (
  candidate: unknown,
  index: number,
  knownChapterIds: Set<string>,
): ValidateAdaptationPlanResult | null => {
  const cardPath = `sceneOutline[${index}]`;
  const err = ensureObject(candidate, `sceneOutline[${index}]`, cardPath);
  if (err) return err;

  const card = candidate as Record<string, unknown>;

  // Required string fields
  for (const field of ['id', 'title', 'dramaticPurpose', 'writerBrief', 'pacing'] as const) {
    const fieldErr = ensureString(card[field], field, cardPath);
    if (fieldErr) return fieldErr;
  }

  // estimatedBlocks
  if (typeof card.estimatedBlocks !== 'number' || !Number.isFinite(card.estimatedBlocks)) {
    return schemaFail(
      'invalid_scene_card_field',
      `estimatedBlocks must be a finite number.`,
      `${cardPath}.estimatedBlocks`,
    );
  }

  // sourceRefs
  if (!Array.isArray(card.sourceRefs)) {
    return schemaFail(
      'invalid_scene_card_field',
      'sourceRefs must be an array.',
      `${cardPath}.sourceRefs`,
    );
  }
  if ((card.sourceRefs as unknown[]).length === 0) {
    return schemaFail(
      'empty_source_refs',
      'sourceRefs must contain at least one reference.',
      `${cardPath}.sourceRefs`,
    );
  }
  for (let i = 0; i < (card.sourceRefs as unknown[]).length; i++) {
    const ref = (card.sourceRefs as unknown[])[i];
    if (!isObject(ref)) {
      return schemaFail(
        'invalid_source_ref',
        `sourceRefs[${i}] must be an object with sourceId and kind.`,
        `${cardPath}.sourceRefs[${i}]`,
      );
    }
    const refObj = ref as Record<string, unknown>;
    const sourceId = refObj.sourceId;
    if (typeof sourceId !== 'string') {
      return schemaFail(
        'invalid_source_ref',
        `sourceRefs[${i}].sourceId must be a string.`,
        `${cardPath}.sourceRefs[${i}].sourceId`,
      );
    }
    if (typeof refObj.kind !== 'string') {
      return schemaFail(
        'invalid_source_ref',
        `sourceRefs[${i}].kind must be a string.`,
        `${cardPath}.sourceRefs[${i}].kind`,
      );
    }
    if (!knownChapterIds.has(sourceId)) {
      return semanticFail(
        'unknown_source_ref',
        `SceneCard "${card.title ?? card.id ?? 'unknown'}" references unknown chapter: ${sourceId}`,
        `${cardPath}.sourceRefs[${i}].sourceId`,
      );
    }
  }

  // headingSuggestion
  const headingErr = ensureObject(card.headingSuggestion, 'headingSuggestion', cardPath);
  if (headingErr) return headingErr;
  const heading = card.headingSuggestion as Record<string, unknown>;
  if (typeof heading.locationType !== 'string' || !heading.locationType) {
    return schemaFail(
      'invalid_scene_heading',
      'headingSuggestion.locationType must be a non-empty string.',
      `${cardPath}.headingSuggestion.locationType`,
    );
  }
  if (typeof heading.location !== 'string') {
    return schemaFail(
      'invalid_scene_heading',
      'headingSuggestion.location must be a string.',
      `${cardPath}.headingSuggestion.location`,
    );
  }
  if (typeof heading.timeOfDay !== 'string') {
    return schemaFail(
      'invalid_scene_heading',
      'headingSuggestion.timeOfDay must be a string.',
      `${cardPath}.headingSuggestion.timeOfDay`,
    );
  }

  return null;
};

const validateAdaptationQuestion = (
  candidate: unknown,
  index: number,
  knownChapterIds: Set<string>,
): ValidateAdaptationPlanResult | null => {
  const qPath = `adaptationQuestions[${index}]`;
  const err = ensureObject(candidate, `adaptationQuestions[${index}]`, qPath);
  if (err) return err;

  const q = candidate as Record<string, unknown>;

  for (const field of ['id', 'question', 'whyItMatters', 'recommendedOptionId'] as const) {
    const fieldErr = ensureString(q[field], field, qPath);
    if (fieldErr) return fieldErr;
  }

  // options
  if (!Array.isArray(q.options)) {
    return schemaFail(
      'invalid_adaptation_question',
      'options must be an array.',
      `${qPath}.options`,
    );
  }
  for (let i = 0; i < (q.options as unknown[]).length; i++) {
    const opt = (q.options as unknown[])[i];
    if (!isObject(opt)) {
      return schemaFail(
        'invalid_adaptation_question_option',
        `options[${i}] must be an object.`,
        `${qPath}.options[${i}]`,
      );
    }
    const optObj = opt as Record<string, unknown>;
    if (typeof optObj.id !== 'string' || typeof optObj.label !== 'string') {
      return schemaFail(
        'invalid_adaptation_question_option',
        `options[${i}] must have string id and label.`,
        `${qPath}.options[${i}]`,
      );
    }
  }

  // sourceRefs
  if (!Array.isArray(q.sourceRefs)) {
    return schemaFail(
      'invalid_adaptation_question',
      'sourceRefs must be an array.',
      `${qPath}.sourceRefs`,
    );
  }
  if ((q.sourceRefs as unknown[]).length === 0) {
    return schemaFail(
      'empty_source_refs',
      'sourceRefs must contain at least one reference.',
      `${qPath}.sourceRefs`,
    );
  }
  for (let i = 0; i < (q.sourceRefs as unknown[]).length; i++) {
    const ref = (q.sourceRefs as unknown[])[i];
    if (!isObject(ref)) {
      return schemaFail(
        'invalid_source_ref',
        `sourceRefs[${i}] must be an object with sourceId and kind.`,
        `${qPath}.sourceRefs[${i}]`,
      );
    }
    const refObj = ref as Record<string, unknown>;
    const sourceId = refObj.sourceId;
    if (typeof sourceId !== 'string') {
      return schemaFail(
        'invalid_source_ref',
        `sourceRefs[${i}].sourceId must be a string.`,
        `${qPath}.sourceRefs[${i}].sourceId`,
      );
    }
    if (typeof refObj.kind !== 'string') {
      return schemaFail(
        'invalid_source_ref',
        `sourceRefs[${i}].kind must be a string.`,
        `${qPath}.sourceRefs[${i}].kind`,
      );
    }
    if (!knownChapterIds.has(sourceId)) {
      return semanticFail(
        'unknown_source_ref',
        `AdaptationQuestion "${q.id ?? 'unknown'}" references unknown chapter: ${sourceId}`,
        `${qPath}.sourceRefs[${i}].sourceId`,
      );
    }
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
  const diagnostics: Diagnostic[] = [];

  // -- null / non-object guard --
  if (candidate === null || candidate === undefined) {
    return schemaFail(
      'null_adaptation_plan',
      'Adaptation plan is null or undefined.',
      'adaptationPlan',
    );
  }
  if (!isObject(candidate)) {
    return schemaFail(
      'invalid_adaptation_plan_type',
      `Expected object, got ${typeof candidate}.`,
      'adaptationPlan',
    );
  }

  const c = candidate as Record<string, unknown>;

  // -- top-level required fields --
  const topStringFields = ['id', 'recommendedPlan'] as const;
  for (const field of topStringFields) {
    const err = ensureString(c[field], field, 'adaptationPlan');
    if (err) return err;
  }

  // -- sourceAnalysis --
  const saErr = validateSourceAnalysis(c.sourceAnalysis, 'adaptationPlan');
  if (saErr) return { ...saErr, diagnostics: [...diagnostics, ...saErr.diagnostics] };

  // -- preferences (light check — just an object) --
  const prefsErr = ensureObject(c.preferences, 'preferences', 'adaptationPlan');
  if (prefsErr) return prefsErr;

  // -- adaptationOptions (array of objects with id/title) --
  const aoErr = ensureArray(c.adaptationOptions, 'adaptationOptions', 'adaptationPlan');
  if (aoErr) return aoErr;
  const adaptationOptions = c.adaptationOptions as unknown[];
  for (let i = 0; i < adaptationOptions.length; i++) {
    const opt = adaptationOptions[i];
    if (!isObject(opt)) {
      return schemaFail(
        'invalid_adaptation_option',
        `adaptationOptions[${i}] must be an object.`,
        `adaptationPlan.adaptationOptions[${i}]`,
      );
    }
    const optObj = opt as Record<string, unknown>;
    if (typeof optObj.id !== 'string' || typeof optObj.title !== 'string') {
      return schemaFail(
        'invalid_adaptation_option',
        `adaptationOptions[${i}] must have string id and title.`,
        `adaptationPlan.adaptationOptions[${i}]`,
      );
    }
  }

  // -- characterUpdates (array of strings) --
  const cuErr = ensureArray(c.characterUpdates, 'characterUpdates', 'adaptationPlan');
  if (cuErr) return cuErr;
  const characterUpdates = c.characterUpdates as unknown[];
  for (let i = 0; i < characterUpdates.length; i++) {
    if (typeof characterUpdates[i] !== 'string') {
      return schemaFail(
        'invalid_character_update',
        `characterUpdates[${i}] must be a string.`,
        `adaptationPlan.characterUpdates[${i}]`,
      );
    }
  }

  // -- risks (array of strings) --
  const risksErr = ensureArray(c.risks, 'risks', 'adaptationPlan');
  if (risksErr) return risksErr;
  const risks = c.risks as unknown[];
  for (let i = 0; i < risks.length; i++) {
    if (typeof risks[i] !== 'string') {
      return schemaFail(
        'invalid_risk',
        `risks[${i}] must be a string.`,
        `adaptationPlan.risks[${i}]`,
      );
    }
  }

  // -- sceneOutline --
  const soErr = ensureArray(c.sceneOutline, 'sceneOutline', 'adaptationPlan');
  if (soErr) return soErr;
  const sceneOutline = c.sceneOutline as unknown[];
  let hasCrossChapterScene = false;
  for (let i = 0; i < sceneOutline.length; i++) {
    const scErr = validateSceneCard(sceneOutline[i], i, options.knownChapterIds);
    if (scErr) return { ...scErr, diagnostics: [...diagnostics, ...scErr.diagnostics] };
    const card = sceneOutline[i] as Record<string, unknown>;
    if (Array.isArray(card.sourceRefs) && card.sourceRefs.length >= 2) {
      hasCrossChapterScene = true;
    }
  }

  // -- adaptationQuestions --
  const aqErr = ensureArray(c.adaptationQuestions, 'adaptationQuestions', 'adaptationPlan');
  if (aqErr) return aqErr;
  const adaptationQuestions = c.adaptationQuestions as unknown[];
  for (let i = 0; i < adaptationQuestions.length; i++) {
    const aqSubErr = validateAdaptationQuestion(adaptationQuestions[i], i, options.knownChapterIds);
    if (aqSubErr) return { ...aqSubErr, diagnostics: [...diagnostics, ...aqSubErr.diagnostics] };
  }

  // -- questionAnswers (array of objects) --
  const qaErr = ensureArray(c.questionAnswers, 'questionAnswers', 'adaptationPlan');
  if (qaErr) return qaErr;
  const questionAnswers = c.questionAnswers as unknown[];
  for (let i = 0; i < questionAnswers.length; i++) {
    const ans = questionAnswers[i];
    if (!isObject(ans)) {
      return schemaFail(
        'invalid_question_answer',
        `questionAnswers[${i}] must be an object.`,
        `adaptationPlan.questionAnswers[${i}]`,
      );
    }
    const ansObj = ans as Record<string, unknown>;
    if (typeof ansObj.questionId !== 'string' || typeof ansObj.optionId !== 'string') {
      return schemaFail(
        'invalid_question_answer',
        `questionAnswers[${i}] must have string questionId and optionId.`,
        `adaptationPlan.questionAnswers[${i}]`,
      );
    }
  }

  // -- question / answer reference integrity --
  const questionMap = new Map<string, Set<string>>();
  for (let i = 0; i < adaptationQuestions.length; i++) {
    const q = adaptationQuestions[i] as Record<string, unknown>;
    const qId = q.id as string;
    const optionIds = new Set<string>();
    for (const opt of q.options as unknown[]) {
      const optObj = opt as Record<string, unknown>;
      if (typeof optObj.id === 'string') {
        optionIds.add(optObj.id);
      }
    }
    questionMap.set(qId, optionIds);

    // recommendedOptionId must exist in this question's options
    const recommendedId = q.recommendedOptionId as string;
    if (!optionIds.has(recommendedId)) {
      return semanticFail(
        'invalid_recommended_option',
        `adaptationQuestions[${i}].recommendedOptionId "${recommendedId}" does not match any option id.`,
        `adaptationPlan.adaptationQuestions[${i}].recommendedOptionId`,
      );
    }
  }

  for (let i = 0; i < questionAnswers.length; i++) {
    const ans = questionAnswers[i] as Record<string, unknown>;
    const ansQuestionId = ans.questionId as string;
    const ansOptionId = ans.optionId as string;

    // answer.source must be 'recommended' | 'user'
    if (ans.source !== 'recommended' && ans.source !== 'user') {
      return schemaFail(
        'invalid_answer_source',
        `questionAnswers[${i}].source must be "recommended" or "user".`,
        `adaptationPlan.questionAnswers[${i}].source`,
      );
    }

    // answer must reference an existing question
    const targetOptions = questionMap.get(ansQuestionId);
    if (!targetOptions) {
      return semanticFail(
        'unknown_question_ref',
        `questionAnswers[${i}].questionId "${ansQuestionId}" does not match any adaptationQuestion id.`,
        `adaptationPlan.questionAnswers[${i}].questionId`,
      );
    }

    // answer must reference an option in that question
    if (!targetOptions.has(ansOptionId)) {
      return semanticFail(
        'unknown_option_ref',
        `questionAnswers[${i}].optionId "${ansOptionId}" does not match any option in question "${ansQuestionId}".`,
        `adaptationPlan.questionAnswers[${i}].optionId`,
      );
    }
  }

  // -- cross-chapter scene warning (non-fatal) --
  if (!hasCrossChapterScene && sceneOutline.length > 0) {
    diagnostics.push({
      severity: 'warning',
      code: 'no_cross_chapter_scene',
      message:
        'No scene card references multiple chapters. Cross-chapter merging is recommended for screenplay adaptation.',
      path: 'adaptationPlan.sceneOutline',
    });
  }

  return { plan: candidate as AdaptationPlan, diagnostics };
};
