// Panels have been migrated to src/features/editor/ and src/features/converter/.
// This barrel file is kept as a re-export convenience during migration.
// New code should import from the feature directories directly.
export { SceneNavigator, ScriptEditorPanel } from '../../features/editor';
export {
  AdaptationPreferencesPanel,
  ConverterWorkspace,
  DiagnosticsBand,
  DiagnosticsPanel,
  SceneOutlinePanel,
  SourcePanel,
  WriterDraftPanel,
} from '../../features/converter';
