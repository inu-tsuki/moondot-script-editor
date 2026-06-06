import { describe, expect, it } from 'vitest';
import {
  appendBlockToScene,
  buildDefaultBlockDraft,
  demoScreenplayDocument,
  insertBlockAfter,
  moveBlock,
} from '../../../src/core/screenplay';
import type { CharacterProfile, ScreenplayDocument } from '../../../src/core/screenplay';

const cloneDocument = (): ScreenplayDocument => structuredClone(demoScreenplayDocument);

describe('screenplay operations', () => {
  it('preserves scene sourceRefs when appending a block', () => {
    const document = cloneDocument();
    const scene = document.script.scenes[0];

    const next = appendBlockToScene(document, scene.id, {
      type: 'action',
      text: '新的动作描写。',
    });

    const appendedBlock = next.script.scenes[0].blocks.at(-1);

    expect(appendedBlock?.sourceRefs).toEqual(scene.sourceRefs);
  });

  it('preserves scene sourceRefs when inserting a block after another block', () => {
    const document = cloneDocument();
    const scene = document.script.scenes[0];

    const next = insertBlockAfter(document, scene.id, scene.blocks[0].id, {
      type: 'note',
      text: '新的批注。',
    });

    const insertedBlock = next.script.scenes[0].blocks[1];

    expect(insertedBlock.sourceRefs).toEqual(scene.sourceRefs);
  });

  it('moves blocks within a scene without changing their ids', () => {
    const document = cloneDocument();
    const scene = document.script.scenes[0];

    const next = moveBlock(document, scene.id, scene.blocks[1].id, 'up');

    expect(next.script.scenes[0].blocks.map((block) => block.id)).toEqual([
      'blk_002',
      'blk_001',
      'blk_003',
    ]);
  });

  it('does not create a dialogue draft without a character registry', () => {
    expect(buildDefaultBlockDraft('dialogue', [])).toBeNull();
  });

  it('uses the first available character for a default dialogue draft', () => {
    const characters: CharacterProfile[] = [
      { id: 'char_alpha', name: 'Alpha', aliases: [] },
      { id: 'char_beta', name: 'Beta', aliases: [] },
    ];

    expect(buildDefaultBlockDraft('dialogue', characters)).toMatchObject({
      type: 'dialogue',
      characterId: 'char_alpha',
    });
  });
});
