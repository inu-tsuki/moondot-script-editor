import { createBlockIdFactory } from '../screenplay';
import type { SceneId, SceneNode, ScreenplayDocument, ScriptBlock } from '../screenplay';
import type { WriterScenePatch } from './types';

// ---------------------------------------------------------------------------
// Apply WriterScenePatch to ScreenplayDocument
// ---------------------------------------------------------------------------

/**
 * Bridge operation that converts a validated WriterScenePatch into
 * SceneNodes and writes them into the document's script.scenes.
 *
 * Block IDs and scene IDs are assigned by this operation — the Writer
 * model never generates branded IDs.
 */
export const applySceneDrafts = (
  document: ScreenplayDocument,
  patch: WriterScenePatch,
): ScreenplayDocument => {
  const nextBlockId = createBlockIdFactory(document);

  const scenes: SceneNode[] = patch.scenes.map((draft, index) => ({
    id: `scene_${String(index + 1).padStart(3, '0')}` as SceneId,
    title: draft.title,
    synopsis: draft.synopsis,
    sourceRefs: draft.sourceRefs,
    heading: draft.heading,
    blocks: draft.blocks.map((blockDraft) => {
      const block = {
        id: nextBlockId(),
        ...blockDraft,
      };
      // Clean up sourceRefs if undefined so the block type matches ScriptBlock.
      if (block.sourceRefs === undefined) {
        delete (block as Record<string, unknown>).sourceRefs;
      }
      return block as ScriptBlock;
    }),
  }));

  return {
    ...document,
    script: {
      structure: { type: 'linear' },
      scenes,
    },
  };
};
