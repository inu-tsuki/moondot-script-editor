import type {
  BlockId,
  CharacterId,
  SceneHeading,
  SceneId,
  ScreenplayDocument,
  ScriptBlock,
} from './types';

const locationTypeLabels: Record<SceneHeading['locationType'], string> = {
  INT: 'INT',
  EXT: 'EXT',
  INT_EXT: 'INT/EXT',
};

const blockIdPattern = /^blk_(\d+)$/;

const formatBlockId = (index: number): BlockId =>
  `blk_${String(index).padStart(3, '0')}` as BlockId;

const getHighestBlockNumericId = (document: ScreenplayDocument) =>
  document.script.scenes
    .flatMap((scene) => scene.blocks)
    .reduce((highestId, block) => {
      const numericId = Number(block.id.match(blockIdPattern)?.[1] ?? 0);

      return Math.max(highestId, numericId);
    }, 0);

/** A new block without id and sourceRefs — filled by append/insert operations. */
export type BlockDraft =
  | { type: 'action'; text: string }
  | { type: 'dialogue'; characterId: CharacterId; parenthetical?: string; text: string }
  | { type: 'narration'; voice?: 'voice_over' | 'off_screen' | 'narrator'; text: string }
  | { type: 'transition'; text: string }
  | { type: 'note'; text: string };

/** All structural editing actions — the unified interface between UI and document. */
export type EditAction =
  | { type: 'select-block'; blockId: BlockId | null }
  | { type: 'delete-block'; sceneId: SceneId; blockId: BlockId }
  | { type: 'move-block'; sceneId: SceneId; blockId: BlockId; direction: 'up' | 'down' }
  | { type: 'insert-block-after'; sceneId: SceneId; afterBlockId: BlockId; draft: BlockDraft }
  | { type: 'append-block'; sceneId: SceneId; draft: BlockDraft }
  | { type: 'update-block-character'; blockId: BlockId; characterId: CharacterId }
  | { type: 'update-parenthetical'; blockId: BlockId; parenthetical: string }
  | { type: 'update-scene-heading'; sceneId: SceneId; patch: Partial<SceneHeading> }
  | {
      type: 'update-scene-metadata';
      sceneId: SceneId;
      patch: { title?: string; synopsis?: string };
    };

export const formatSceneHeading = (heading: SceneHeading) =>
  `${locationTypeLabels[heading.locationType]}. ${heading.location} - ${heading.timeOfDay}`;

export const getBlockCharacterId = (block: ScriptBlock): CharacterId | undefined =>
  block.type === 'dialogue' ? block.characterId : undefined;

export const createNextBlockId = (document: ScreenplayDocument): BlockId =>
  formatBlockId(getHighestBlockNumericId(document) + 1);

export const createBlockIdFactory = (document: ScreenplayDocument) => {
  let nextNumericId = getHighestBlockNumericId(document) + 1;

  return () => {
    const blockId = formatBlockId(nextNumericId);
    nextNumericId += 1;

    return blockId;
  };
};

// ---------------------------------------------------------------------------
// Block CRUD
// ---------------------------------------------------------------------------

export const appendBlockToScene = (
  document: ScreenplayDocument,
  sceneId: SceneId,
  draft: BlockDraft,
): ScreenplayDocument => {
  const nextBlock: ScriptBlock = {
    id: createNextBlockId(document),
    ...draft,
  } as ScriptBlock;

  return {
    ...document,
    script: {
      ...document.script,
      scenes: document.script.scenes.map((scene) =>
        scene.id === sceneId ? { ...scene, blocks: [...scene.blocks, nextBlock] } : scene,
      ),
    },
  };
};

export const appendBlockToFirstScene = (
  document: ScreenplayDocument,
  block: BlockDraft = {
    type: 'action',
    text: '新的动作描写。',
  },
): ScreenplayDocument => {
  const scene = document.script.scenes[0];
  if (!scene) return document;
  return appendBlockToScene(document, scene.id, block);
};

export const insertBlockAfter = (
  document: ScreenplayDocument,
  sceneId: SceneId,
  afterBlockId: BlockId,
  draft: BlockDraft,
): ScreenplayDocument => {
  const nextBlock: ScriptBlock = {
    id: createNextBlockId(document),
    ...draft,
  } as ScriptBlock;

  return {
    ...document,
    script: {
      ...document.script,
      scenes: document.script.scenes.map((scene) => {
        if (scene.id !== sceneId) return scene;

        const afterIndex = scene.blocks.findIndex((b) => b.id === afterBlockId);
        if (afterIndex === -1) return scene;

        const blocks = [...scene.blocks];
        blocks.splice(afterIndex + 1, 0, nextBlock);

        return { ...scene, blocks };
      }),
    },
  };
};

export const deleteBlock = (
  document: ScreenplayDocument,
  sceneId: SceneId,
  blockId: BlockId,
): ScreenplayDocument => ({
  ...document,
  script: {
    ...document.script,
    scenes: document.script.scenes.map((scene) =>
      scene.id === sceneId
        ? { ...scene, blocks: scene.blocks.filter((b) => b.id !== blockId) }
        : scene,
    ),
  },
});

export const moveBlock = (
  document: ScreenplayDocument,
  sceneId: SceneId,
  blockId: BlockId,
  direction: 'up' | 'down',
): ScreenplayDocument => ({
  ...document,
  script: {
    ...document.script,
    scenes: document.script.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;

      const index = scene.blocks.findIndex((b) => b.id === blockId);
      if (index === -1) return scene;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= scene.blocks.length) return scene;

      const blocks = [...scene.blocks];
      [blocks[index], blocks[targetIndex]] = [blocks[targetIndex], blocks[index]];

      return { ...scene, blocks };
    }),
  },
});

export const duplicateBlock = (
  document: ScreenplayDocument,
  sceneId: SceneId,
  blockId: BlockId,
): ScreenplayDocument => ({
  ...document,
  script: {
    ...document.script,
    scenes: document.script.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;

      const index = scene.blocks.findIndex((b) => b.id === blockId);
      if (index === -1) return scene;

      const original = scene.blocks[index];
      const duplicate: ScriptBlock = {
        ...original,
        id: createNextBlockId(document),
      };

      const blocks = [...scene.blocks];
      blocks.splice(index + 1, 0, duplicate);

      return { ...scene, blocks };
    }),
  },
});

// ---------------------------------------------------------------------------
// Block field updates
// ---------------------------------------------------------------------------

export const updateBlockText = (
  document: ScreenplayDocument,
  blockId: BlockId,
  text: string,
): ScreenplayDocument => ({
  ...document,
  script: {
    ...document.script,
    scenes: document.script.scenes.map((scene) => ({
      ...scene,
      blocks: scene.blocks.map((block) => (block.id === blockId ? { ...block, text } : block)),
    })),
  },
});

export const updateBlockCharacter = (
  document: ScreenplayDocument,
  blockId: BlockId,
  characterId: CharacterId,
): ScreenplayDocument => ({
  ...document,
  script: {
    ...document.script,
    scenes: document.script.scenes.map((scene) => ({
      ...scene,
      blocks: scene.blocks.map((block) =>
        block.id === blockId && block.type === 'dialogue' ? { ...block, characterId } : block,
      ),
    })),
  },
});

export const updateDialogueParenthetical = (
  document: ScreenplayDocument,
  blockId: BlockId,
  parenthetical: string,
): ScreenplayDocument => ({
  ...document,
  script: {
    ...document.script,
    scenes: document.script.scenes.map((scene) => ({
      ...scene,
      blocks: scene.blocks.map((block) =>
        block.id === blockId && block.type === 'dialogue'
          ? { ...block, parenthetical: parenthetical || undefined }
          : block,
      ),
    })),
  },
});

// ---------------------------------------------------------------------------
// Scene metadata
// ---------------------------------------------------------------------------

export const updateSceneHeading = (
  document: ScreenplayDocument,
  sceneId: SceneId,
  patch: Partial<SceneHeading>,
): ScreenplayDocument => ({
  ...document,
  script: {
    ...document.script,
    scenes: document.script.scenes.map((scene) =>
      scene.id === sceneId ? { ...scene, heading: { ...scene.heading, ...patch } } : scene,
    ),
  },
});

export const updateSceneMetadata = (
  document: ScreenplayDocument,
  sceneId: SceneId,
  patch: { title?: string; synopsis?: string },
): ScreenplayDocument => ({
  ...document,
  script: {
    ...document.script,
    scenes: document.script.scenes.map((scene) =>
      scene.id === sceneId ? { ...scene, ...patch } : scene,
    ),
  },
});
