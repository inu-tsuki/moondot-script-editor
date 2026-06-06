import { AlertTriangle, Plus, Sparkles } from 'lucide-react';
import { Button, PanelBody, PanelHeader, PanelShell, PanelTitle } from '../ui';
import { ScenePage } from './ScenePage';
import type { BlockId, CharacterId, CharacterProfile, SceneNode } from '../../core/screenplay';

type ScriptEditorPanelProps = {
  charactersById: Map<CharacterId, CharacterProfile>;
  scene: SceneNode | undefined;
  onAddBlock: () => void;
  onUpdateBlockText: (id: BlockId, text: string) => void;
};

export function ScriptEditorPanel({
  charactersById,
  scene,
  onAddBlock,
  onUpdateBlockText,
}: ScriptEditorPanelProps) {
  return (
    <PanelShell>
      <PanelHeader>
        <PanelTitle icon={<Sparkles size={16} />}>Semantic Blocks</PanelTitle>
        <Button title="增加语义块" onClick={onAddBlock}>
          <Plus size={16} />
          Block
        </Button>
      </PanelHeader>
      <PanelBody>
        {scene ? (
          <ScenePage
            scene={scene}
            charactersById={charactersById}
            onUpdateBlockText={onUpdateBlockText}
          />
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-[#ebce7a] bg-[#fff6db] p-2.5 text-xs leading-relaxed text-[#5e4a15]">
            <AlertTriangle className="mt-px shrink-0" size={16} />
            <span>当前 document 没有可编辑场景。</span>
          </div>
        )}
      </PanelBody>
    </PanelShell>
  );
}
