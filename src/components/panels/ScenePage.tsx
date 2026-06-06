import { useState } from 'react';
import { PanelMeta } from '../ui';
import { getBlockCharacterId } from '../../core/screenplay';
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

type EditingField = 'locationType' | 'location' | 'timeOfDay' | 'title' | 'synopsis' | null;

export function ScenePage({
  scene,
  charactersById,
  selectedBlockId,
  onEdit,
  onUpdateBlockText,
}: ScenePageProps) {
  const [editingField, setEditingField] = useState<EditingField>(null);

  const allCharacters = [...charactersById.values()];

  const startEditing = (field: EditingField) => setEditingField(field);
  const commitEditing = () => setEditingField(null);

  const renderBlockEditor = (block: ScriptBlock, index: number) => {
    const isSelected = block.id === selectedBlockId;
    const onChange = (text: string) => onUpdateBlockText(block.id, text);

    const editor = (() => {
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
              allCharacters={allCharacters}
              block={block}
              characterName={characterName}
              isSelected={isSelected}
              onChange={onChange}
              onEdit={onEdit}
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
    })();

    return (
      <div
        key={block.id}
        className={`rounded-md transition-shadow ${isSelected ? 'ring-1 ring-[#bfb59c]' : ''}`}
        onClick={(e) => {
          // Don't toggle selection when clicking interactive child elements
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
        {editor}
        {isSelected ? (
          <BlockToolbar
            blockId={block.id}
            blockIndex={index}
            characters={allCharacters}
            onEdit={onEdit}
            sceneId={scene.id}
            totalBlocks={scene.blocks.length}
          />
        ) : null}
      </div>
    );
  };

  const renderEditableField = (
    field: EditingField & string,
    value: string,
    display: React.ReactNode,
    inputType: 'input' | 'select' | 'textarea' = 'input',
    selectOptions?: { value: string; label: string }[],
  ) => {
    if (editingField !== field) {
      return (
        <button
          className="cursor-text text-left hover:opacity-70"
          onClick={() => startEditing(field)}
          type="button"
        >
          {display}
        </button>
      );
    }

    const commonClasses =
      'rounded border border-[#cfc7ba] bg-white px-1.5 py-0.5 text-[#17211d] outline-none';

    if (inputType === 'select' && selectOptions) {
      return (
        <select
          autoFocus
          className={commonClasses}
          onBlur={commitEditing}
          onChange={(e) => {
            onEdit({
              type: 'update-scene-heading',
              sceneId: scene.id,
              patch: { [field]: e.target.value },
            });
            commitEditing();
          }}
          value={value}
        >
          {selectOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (inputType === 'textarea') {
      return (
        <textarea
          autoFocus
          className={`${commonClasses} w-full resize-none`}
          onBlur={commitEditing}
          onChange={(e) => {
            onEdit({
              type: 'update-scene-metadata',
              sceneId: scene.id,
              patch: { [field]: e.target.value },
            });
          }}
          rows={2}
          value={value}
        />
      );
    }

    return (
      <input
        autoFocus
        className={commonClasses}
        onBlur={commitEditing}
        onChange={(e) => {
          const actionType =
            field === 'title' || field === 'synopsis'
              ? 'update-scene-metadata'
              : 'update-scene-heading';
          onEdit({
            type: actionType,
            sceneId: scene.id,
            patch: { [field]: e.target.value },
          } as EditAction);
        }}
        type="text"
        value={value}
      />
    );
  };

  const locationTypeOptions = [
    { value: 'INT', label: 'INT' },
    { value: 'EXT', label: 'EXT' },
    { value: 'INT_EXT', label: 'INT/EXT' },
  ];

  return (
    <article className="overflow-hidden rounded-lg border border-[#d9d1c4] bg-[#fffdf8]">
      <div className="border-b border-[#e4d9c9] px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-extrabold uppercase tracking-wide text-[#7b6651]">
            {renderEditableField(
              'locationType',
              scene.heading.locationType,
              <span>
                {scene.heading.locationType === 'INT_EXT' ? 'INT/EXT' : scene.heading.locationType}.
              </span>,
              'select',
              locationTypeOptions,
            )}
            {renderEditableField(
              'location',
              scene.heading.location,
              <span>{scene.heading.location}</span>,
            )}
            <span>-</span>
            {renderEditableField(
              'timeOfDay',
              scene.heading.timeOfDay,
              <span>{scene.heading.timeOfDay}</span>,
            )}
          </div>
          <PanelMeta>{scene.id}</PanelMeta>
        </div>
        {scene.title ? (
          <div className="mt-2">
            {renderEditableField(
              'title',
              scene.title,
              <span className="text-lg font-extrabold text-[#17211d]">{scene.title}</span>,
            )}
          </div>
        ) : null}
        {scene.synopsis ? (
          <div className="mt-1">
            {renderEditableField(
              'synopsis',
              scene.synopsis,
              <span className="text-[13px] leading-relaxed text-[#56615a]">{scene.synopsis}</span>,
              'textarea',
            )}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 px-4 py-4">
        {scene.blocks.map((block, index) => renderBlockEditor(block, index))}
      </div>
    </article>
  );
}
