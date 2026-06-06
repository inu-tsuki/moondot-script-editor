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

// ---------------------------------------------------------------------------
// Manuscript tokens — stable class compositions shared across all editors
// ---------------------------------------------------------------------------

const manuscriptField =
  'bg-transparent border border-transparent outline-none hover:opacity-70 focus:rounded focus:border-[#cfc7ba] focus:bg-[#fffdf8] focus:px-1 focus:opacity-100';

const manuscriptSelect = `${manuscriptField} appearance-none cursor-pointer`;

const manuscriptText =
  'w-full resize-none overflow-hidden border border-transparent bg-transparent p-0 outline-none transition-colors focus:rounded-md focus:border-[#cfc7ba] focus:bg-[#fffdf8]';

const manuscriptTextarea = `${manuscriptText} resize-none`;

const headingFieldClass = `${manuscriptField} font-extrabold uppercase tracking-wide text-[#7b6651]`;

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
          return (
            <ActionBlockEditor
              key={block.id}
              block={block}
              className={manuscriptText}
              onChange={onChange}
            />
          );
        case 'dialogue':
          return (
            <DialogueBlockEditor
              key={block.id}
              allCharacters={allCharacters}
              block={block}
              isSelected={isSelected}
              manuscriptField={manuscriptField}
              manuscriptText={manuscriptText}
              onChange={onChange}
              onEdit={onEdit}
            />
          );
        case 'narration':
          return (
            <NarrationBlockEditor
              key={block.id}
              block={block}
              className={manuscriptText}
              onChange={onChange}
            />
          );
        case 'transition':
          return (
            <TransitionBlockEditor
              key={block.id}
              block={block}
              className={manuscriptText}
              onChange={onChange}
            />
          );
        case 'note':
          return (
            <NoteBlockEditor
              key={block.id}
              block={block}
              className={manuscriptText}
              onChange={onChange}
            />
          );
      }
    })();

    return (
      <div
        key={block.id}
        className={`group grid grid-cols-[32px_1fr_auto] items-start gap-x-2 ${
          isSelected ? 'bg-[#f4f1ea]' : ''
        } -mx-10 rounded px-10 transition-colors`}
      >
        {/* Left gutter: selection handle */}
        <button
          aria-label={`Select block ${block.id}`}
          className={`mt-1 h-full min-h-[24px] cursor-pointer border-l-2 transition-colors ${
            isSelected
              ? 'border-l-[#7b6651]'
              : 'border-l-transparent group-hover:border-l-[#d9d1c4]'
          }`}
          onClick={() =>
            onEdit({
              type: 'select-block',
              blockId: isSelected ? null : block.id,
            })
          }
          type="button"
        />

        {/* Content area: pure editing, no selection logic */}
        <div className="min-w-0">{editor}</div>

        {/* Right gutter: toolbar */}
        <div
          className={`pt-0.5 transition-opacity ${
            isSelected ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
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
    );
  };

  return (
    <article>
      <header className="mb-6 border-b border-[#e4ded3] pb-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-extrabold uppercase tracking-wide text-[#7b6651]">
          <select
            aria-label="Location type"
            className={`${manuscriptSelect} font-extrabold uppercase tracking-wide text-[#7b6651]`}
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
        <div className="mt-2">
          <input
            aria-label="Scene title"
            className={`${manuscriptField} w-full text-lg font-extrabold text-[#17211d] placeholder:font-extrabold placeholder:text-[#b0a89a]`}
            onChange={(e) =>
              onEdit({
                type: 'update-scene-metadata',
                sceneId: scene.id,
                patch: { title: e.target.value },
              })
            }
            placeholder="场景标题"
            type="text"
            value={scene.title ?? ''}
          />
        </div>
        <div className="mt-1">
          <textarea
            aria-label="Scene synopsis"
            className={`${manuscriptTextarea} w-full text-[13px] leading-relaxed text-[#56615a] placeholder:text-[#b0a89a]`}
            onChange={(e) =>
              onEdit({
                type: 'update-scene-metadata',
                sceneId: scene.id,
                patch: { synopsis: e.target.value },
              })
            }
            placeholder="场景梗概"
            rows={2}
            value={scene.synopsis ?? ''}
          />
        </div>
      </header>
      <div className="flex flex-col">
        {scene.blocks.map((block, index) => renderBlockEditor(block, index))}
      </div>
    </article>
  );
}
