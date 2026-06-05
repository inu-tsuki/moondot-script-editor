import type { BlockId, CharacterId, SceneHeading, ScreenplayDocument, ScriptBlock } from './types';

const locationTypeLabels: Record<SceneHeading['locationType'], string> = {
  INT: 'INT',
  EXT: 'EXT',
  INT_EXT: 'INT/EXT',
};

const blockIdPattern = /^blk_(\d+)$/;

export const formatSceneHeading = (heading: SceneHeading) =>
  `${locationTypeLabels[heading.locationType]}. ${heading.location} - ${heading.timeOfDay}`;

export const getBlockCharacterId = (block: ScriptBlock): CharacterId | undefined =>
  block.type === 'dialogue' ? block.characterId : undefined;

export const createNextBlockId = (document: ScreenplayDocument): BlockId => {
  const highestNumericId = document.script.scenes
    .flatMap((scene) => scene.blocks)
    .reduce((highestId, block) => {
      const numericId = Number(block.id.match(blockIdPattern)?.[1] ?? 0);

      return Math.max(highestId, numericId);
    }, 0);

  return `blk_${String(highestNumericId + 1).padStart(3, '0')}` as BlockId;
};

export const appendBlockToFirstScene = (
  document: ScreenplayDocument,
  block: Omit<ScriptBlock, 'id'> = {
    type: 'action',
    text: '新的动作描写。',
  },
): ScreenplayDocument => {
  const scene = document.script.scenes[0];

  if (!scene) {
    return document;
  }

  const nextBlock: ScriptBlock = {
    id: createNextBlockId(document),
    sourceRefs: scene.sourceRefs,
    ...block,
  } as ScriptBlock;

  return {
    ...document,
    script: {
      ...document.script,
      scenes: document.script.scenes.map((currentScene) =>
        currentScene.id === scene.id
          ? {
              ...currentScene,
              blocks: [...currentScene.blocks, nextBlock],
            }
          : currentScene,
      ),
    },
  };
};

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
