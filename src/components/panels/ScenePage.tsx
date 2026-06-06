import { PanelMeta } from '../ui';
import { formatSceneHeading, getBlockCharacterId } from '../../core/screenplay';
import {
  ActionBlockEditor,
  DialogueBlockEditor,
  NarrationBlockEditor,
  NoteBlockEditor,
  TransitionBlockEditor,
} from './editors';
import type {
  BlockId,
  CharacterId,
  CharacterProfile,
  SceneNode,
  ScriptBlock,
} from '../../core/screenplay';

type ScenePageProps = {
  scene: SceneNode;
  charactersById: Map<CharacterId, CharacterProfile>;
  onUpdateBlockText: (id: BlockId, text: string) => void;
};

export function ScenePage({ scene, charactersById, onUpdateBlockText }: ScenePageProps) {
  const renderBlockEditor = (block: ScriptBlock) => {
    const onChange = (text: string) => onUpdateBlockText(block.id, text);

    switch (block.type) {
      case 'action':
        return <ActionBlockEditor key={block.id} block={block} onChange={onChange} />;
      case 'dialogue': {
        const characterId = getBlockCharacterId(block);
        const characterName = characterId
          ? (charactersById.get(characterId)?.name ?? characterId)
          : undefined;
        return (
          <DialogueBlockEditor
            key={block.id}
            block={block}
            characterName={characterName}
            onChange={onChange}
          />
        );
      }
      case 'narration':
        return <NarrationBlockEditor key={block.id} block={block} onChange={onChange} />;
      case 'transition':
        return <TransitionBlockEditor key={block.id} block={block} onChange={onChange} />;
      case 'note':
        return <NoteBlockEditor key={block.id} block={block} onChange={onChange} />;
    }
  };

  return (
    <article className="overflow-hidden rounded-lg border border-[#d9d1c4] bg-[#fffdf8]">
      <div className="border-b border-[#e4d9c9] px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="font-extrabold uppercase tracking-wide text-[#7b6651]">
            {formatSceneHeading(scene.heading)}
          </div>
          <PanelMeta>{scene.id}</PanelMeta>
        </div>
        {scene.title ? (
          <div className="mt-2 text-lg font-extrabold text-[#17211d]">{scene.title}</div>
        ) : null}
        {scene.synopsis ? (
          <div className="mt-1 text-[13px] leading-relaxed text-[#56615a]">{scene.synopsis}</div>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 px-4 py-4">
        {scene.blocks.map((block) => renderBlockEditor(block))}
      </div>
    </article>
  );
}
