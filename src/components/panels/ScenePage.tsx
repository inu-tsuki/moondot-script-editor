import { PanelMeta } from '../ui';
import { BlockToolbar } from './BlockToolbar';
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
  EditAction,
  SceneNode,
  ScriptBlock,
} from '../../core/screenplay';

type ScenePageProps = {
  scene: SceneNode;
  charactersById: Map<CharacterId, CharacterProfile>;
  selectedBlockId: BlockId | null;
  onEdit: (action: EditAction) => void;
  onUpdateBlockText: (id: BlockId, text: string) => void;
};

// Ghost control base styles: controls always exist, styled to look like static text when idle
const ghostBase = 'bg-transparent border border-transparent outline-none hover:opacity-70';
const ghostFocus =
  'focus:rounded focus:border-[#cfc7ba] focus:bg-[#fffdf8] focus:px-1 focus:opacity-100';

const ghostSelect = `${ghostBase} ${ghostFocus} appearance-none cursor-pointer`;
const ghostInput = `${ghostBase} ${ghostFocus}`;
const ghostTextarea = `${ghostBase} ${ghostFocus} resize-none`;

const headingFieldClass = `${ghostInput} font-extrabold uppercase tracking-wide text-[#7b6651]`;

const locationTypeOptions = [
  { value: 'INT', label: 'INT.' },
  { value: 'EXT', label: 'EXT.' },
  { value: 'INT_EXT', label: 'INT/EXT.' },
];

export function ScenePage({
  scene,
  charactersById,
  selectedBlockId,
  onEdit,
  onUpdateBlockText,
}: ScenePageProps) {
  const allCharacters = [...charactersById.values()];

  const renderBlockEditor = (block: ScriptBlock, index: number) => {
    const isSelected = block.id === selectedBlockId;
    const onChange = (text: string) => onUpdateBlockText(block.id, text);

    const editor = (() => {
      switch (block.type) {
        case 'action':
          return <ActionBlockEditor key={block.id} block={block} onChange={onChange} />;
        case 'dialogue':
          return (
            <DialogueBlockEditor
              key={block.id}
              allCharacters={allCharacters}
              block={block}
              isSelected={isSelected}
              onChange={onChange}
              onEdit={onEdit}
            />
          );
        case 'narration':
          return <NarrationBlockEditor key={block.id} block={block} onChange={onChange} />;
        case 'transition':
          return <TransitionBlockEditor key={block.id} block={block} onChange={onChange} />;
        case 'note':
          return <NoteBlockEditor key={block.id} block={block} onChange={onChange} />;
      }
    })();

    return (
      <div
        key={block.id}
        className={`rounded-md transition-shadow ${isSelected ? 'ring-1 ring-[#bfb59c]' : ''}`}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement ||
            target instanceof HTMLInputElement ||
            target.closest('button')
          ) {
            return;
          }
          onEdit({
            type: 'select-block',
            blockId: isSelected ? null : block.id,
          });
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onEdit({
              type: 'select-block',
              blockId: isSelected ? null : block.id,
            });
          }
        }}
        role="button"
        tabIndex={0}
      >
        {/* Toolbar is always rendered, positioned absolutely to never affect document flow */}
        <div className="relative">
          {editor}
          <div
            className={`absolute left-0 top-full z-10 mt-1 transition-opacity ${isSelected ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            <BlockToolbar
              blockId={block.id}
              blockIndex={index}
              characters={allCharacters}
              onEdit={onEdit}
              sceneId={scene.id}
              totalBlocks={scene.blocks.length}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <article className="overflow-hidden rounded-lg border border-[#d9d1c4] bg-[#fffdf8]">
      <div className="border-b border-[#e4d9c9] px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-extrabold uppercase tracking-wide text-[#7b6651]">
            <select
              aria-label="Location type"
              className={`${ghostSelect} font-extrabold uppercase tracking-wide text-[#7b6651]`}
              onChange={(e) =>
                onEdit({
                  type: 'update-scene-heading',
                  sceneId: scene.id,
                  patch: { locationType: e.target.value as SceneNode['heading']['locationType'] },
                })
              }
              value={scene.heading.locationType}
            >
              {locationTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              aria-label="Location"
              className={headingFieldClass}
              onChange={(e) =>
                onEdit({
                  type: 'update-scene-heading',
                  sceneId: scene.id,
                  patch: { location: e.target.value },
                })
              }
              type="text"
              value={scene.heading.location}
            />
            <span>-</span>
            <input
              aria-label="Time of day"
              className={headingFieldClass}
              onChange={(e) =>
                onEdit({
                  type: 'update-scene-heading',
                  sceneId: scene.id,
                  patch: { timeOfDay: e.target.value },
                })
              }
              type="text"
              value={scene.heading.timeOfDay}
            />
          </div>
          <PanelMeta>{scene.id}</PanelMeta>
        </div>
        {scene.title ? (
          <div className="mt-2">
            <input
              aria-label="Scene title"
              className={`${ghostInput} w-full text-lg font-extrabold text-[#17211d]`}
              onChange={(e) =>
                onEdit({
                  type: 'update-scene-metadata',
                  sceneId: scene.id,
                  patch: { title: e.target.value },
                })
              }
              type="text"
              value={scene.title}
            />
          </div>
        ) : null}
        {scene.synopsis ? (
          <div className="mt-1">
            <textarea
              aria-label="Scene synopsis"
              className={`${ghostTextarea} w-full text-[13px] leading-relaxed text-[#56615a]`}
              onChange={(e) =>
                onEdit({
                  type: 'update-scene-metadata',
                  sceneId: scene.id,
                  patch: { synopsis: e.target.value },
                })
              }
              rows={2}
              value={scene.synopsis}
            />
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 px-4 py-4">
        {scene.blocks.map((block, index) => renderBlockEditor(block, index))}
      </div>
    </article>
  );
}
