import { AlertTriangle } from 'lucide-react';
import { ManuscriptSurface } from './ManuscriptSurface';
import { ScenePage } from './ScenePage';
import type {
  BlockId,
  CharacterId,
  CharacterProfile,
  EditAction,
  SceneNode,
} from '../../core/screenplay';

type ScriptEditorPanelProps = {
  charactersById: Map<CharacterId, CharacterProfile>;
  scene: SceneNode | undefined;
  selectedBlockId: BlockId | null;
  onEdit: (action: EditAction) => void;
  onUpdateBlockText: (id: BlockId, text: string) => void;
};

/**
 * Script editor panel — wraps the active scene page inside a manuscript
 * reading surface.  Block insertion controls have moved up to EditorHeader
 * so this component only owns scene rendering and the empty-document state.
 */
export function ScriptEditorPanel({
  charactersById,
  scene,
  selectedBlockId,
  onEdit,
  onUpdateBlockText,
}: ScriptEditorPanelProps) {
  return (
    <ManuscriptSurface>
      {scene ? (
        <ScenePage
          scene={scene}
          charactersById={charactersById}
          selectedBlockId={selectedBlockId}
          onEdit={onEdit}
          onUpdateBlockText={onUpdateBlockText}
        />
      ) : (
        <div className="flex items-start gap-2 rounded-md border border-[#ebce7a] bg-[#fff6db] p-2.5 text-xs leading-relaxed text-[#5e4a15]">
          <AlertTriangle className="mt-px shrink-0" size={16} />
          <span>当前 document 没有可编辑场景。</span>
        </div>
      )}
    </ManuscriptSurface>
  );
}
