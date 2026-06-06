import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ScenePage } from '../../src/components/panels/ScenePage';
import { demoScreenplayDocument } from '../../src/core/screenplay';
import type { EditAction, ScreenplayDocument } from '../../src/core/screenplay';

const cloneDocument = (): ScreenplayDocument => structuredClone(demoScreenplayDocument);

const renderScenePage = (document = cloneDocument(), selectedBlockId: string | null = null) => {
  const onEdit = vi.fn<(action: EditAction) => void>();
  const onUpdateBlockText = vi.fn();
  const charactersById = new Map(document.characters.map((character) => [character.id, character]));

  render(
    <ScenePage
      scene={document.script.scenes[0]}
      charactersById={charactersById}
      selectedBlockId={selectedBlockId as never}
      onEdit={onEdit}
      onUpdateBlockText={onUpdateBlockText}
    />,
  );

  return { onEdit, onUpdateBlockText };
};

describe('ScenePage', () => {
  it('keeps scene title and synopsis editable when they are empty', () => {
    const document = cloneDocument();
    document.script.scenes[0].title = '';
    document.script.scenes[0].synopsis = '';

    renderScenePage(document);

    expect(screen.getByLabelText('Scene title')).toBeInTheDocument();
    expect(screen.getByLabelText('Scene synopsis')).toBeInTheDocument();
  });

  it('selects a block when its text editor receives focus', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderScenePage();

    await user.click(screen.getByLabelText('Action blk_001'));

    expect(onEdit).toHaveBeenCalledWith({ type: 'select-block', blockId: 'blk_001' });
  });

  it('shows the selected block toolbar and dispatches insert actions', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderScenePage(cloneDocument(), 'blk_001');
    const selectedToolbar = within(screen.getByTestId('block-toolbar-blk_001'));

    await user.click(selectedToolbar.getByTitle('Insert block after'));
    await user.click(screen.getByRole('button', { name: 'Action' }));

    expect(screen.getByTestId('block-toolbar-blk_001')).toBeVisible();
    expect(onEdit).toHaveBeenCalledWith({
      type: 'insert-block-after',
      sceneId: 'scene_001',
      afterBlockId: 'blk_001',
      draft: { type: 'action', text: '新的动作描写。' },
    });
  });
});
