export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export type Diagnostic = {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  path: string;
  suggestion?: string;
};

/**
 * Which display stage a diagnostic belongs to — determines where it surfaces
 * in the converter UI (source area, plan area, or document export tail).
 */
export type DiagnosticStage = 'source' | 'plan' | 'document';

const SOURCE_PATH_PREFIXES = ['source.chapters', 'sourceText'] as const;

/**
 * Classify a diagnostic into its intended display stage using its `path` and
 * `code`.  Source diagnostics cover the raw source text and parsed chapter
 * structure; plan diagnostics cover adaptation plans and model-level issues;
 * everything else is a document / export diagnostic.
 *
 * If future source adapters (beyond novel) produce diagnostic paths under
 * different prefixes, add them to `SOURCE_PATH_PREFIXES` or refine the logic
 * here instead of scattering string checks in `App.tsx`.
 */
export function getDiagnosticStage(diagnostic: Diagnostic): DiagnosticStage {
  const { path, code } = diagnostic;

  // Source input and chapter structure
  for (const prefix of SOURCE_PATH_PREFIXES) {
    if (path === prefix || path?.startsWith(`${prefix}[`)) {
      return 'source';
    }
  }

  // Adaptation plan / model-level
  if (path === 'model' || code?.startsWith('model_') || code?.startsWith('adaptation_')) {
    return 'plan';
  }

  return 'document';
}
