import { buildDefaultBlockDraft } from '../../core/screenplay';
import type {
  BlockId,
  CharacterId,
  CharacterProfile,
  EditAction,
  SceneNode,
} from '../../core/screenplay';
import { EditorHeader } from './EditorHeader';
import { ExportBar } from './ExportBar';
import { ScriptEditorPanel } from './ScriptEditorPanel';

type EditorWorkspaceProps = {
  scenes: SceneNode[];
  activeSceneIndex: number;
  activeScene: SceneNode | undefined;
  charactersById: Map<CharacterId, CharacterProfile>;
  selectedBlockId: BlockId | null;
  onSelectScene: (index: number) => void;
  onEdit: (action: EditAction) => void;
  onUpdateBlockText: (id: BlockId, text: string) => void;
  // Export bar
  exportReady: boolean;
  exportErrorCount: number;
  exportWarningCount: number;
  exportFeedback: string;
  onCopyYaml: () => void;
  onDownloadYaml: () => void;
};

/**
 * Editor workspace — owns the composition of scene navigation, script editor
 * and YAML export bar.
 *
 * Renders a vertical flex column so child flex-1 allocations work reliably
 * in both wide (DockLayout split) and narrow (stacked) viewports.
 */
export function EditorWorkspace({
  scenes,
  activeSceneIndex,
  activeScene,
  charactersById,
  selectedBlockId,
  onSelectScene,
  onEdit,
  onUpdateBlockText,
  exportReady,
  exportErrorCount,
  exportWarningCount,
  exportFeedback,
  onCopyYaml,
  onDownloadYaml,
}: EditorWorkspaceProps) {
  const handleAppendBlock = (type: string) => {
    if (!activeScene) return;
    const draft = buildDefaultBlockDraft(type, [...charactersById.values()]);
    if (!draft) return;
    onEdit({ type: 'append-block', sceneId: activeScene.id, draft });
  };

  return (
    <section className="flex flex-1 flex-col min-h-0 gap-3" aria-label="Editor workspace">
      <EditorHeader
        scenes={scenes}
        activeSceneIndex={activeSceneIndex}
        onSelectScene={onSelectScene}
        allCharacters={[...charactersById.values()]}
        hasActiveScene={activeScene !== undefined}
        onAppendBlock={handleAppendBlock}
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <ScriptEditorPanel
          charactersById={charactersById}
          scene={activeScene}
          selectedBlockId={selectedBlockId}
          onEdit={onEdit}
          onUpdateBlockText={onUpdateBlockText}
        />
      </div>

      <ExportBar
        isReady={exportReady}
        errorCount={exportErrorCount}
        warningCount={exportWarningCount}
        feedback={exportFeedback || null}
        onCopy={onCopyYaml}
        onDownload={onDownloadYaml}
      />
    </section>
  );
}
