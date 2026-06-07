import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ScriptEditorPanel } from '../../src/features/editor/ScriptEditorPanel';
import { demoScreenplayDocument } from '../../src/core/screenplay';
import type { EditAction, ScreenplayDocument } from '../../src/core/screenplay';

const cloneDocument = (): ScreenplayDocument => structuredClone(demoScreenplayDocument);

describe('ScriptEditorPanel', () => {
  it('renders the active scene page when a scene is provided', () => {
    const document = cloneDocument();
    const charactersById = new Map(
      document.characters.map((character) => [character.id, character]),
    );

    render(
      <ScriptEditorPanel
        charactersById={charactersById}
        scene={document.script.scenes[0]}
        selectedBlockId={null}
        onEdit={vi.fn()}
        onUpdateBlockText={vi.fn()}
      />,
    );

    // Scene heading inputs are visible
    expect(screen.getByLabelText('Location')).toBeInTheDocument();
    expect(screen.getByLabelText('Scene title')).toBeInTheDocument();
  });

  it('shows empty state when no scene is provided', () => {
    render(
      <ScriptEditorPanel
        charactersById={new Map()}
        scene={undefined}
        selectedBlockId={null}
        onEdit={vi.fn()}
        onUpdateBlockText={vi.fn()}
      />,
    );

    expect(screen.getByText('当前 document 没有可编辑场景。')).toBeInTheDocument();
  });

  it('selects a block when its selection handle is clicked', async () => {
    const user = userEvent.setup();
    const document = cloneDocument();
    const charactersById = new Map(
      document.characters.map((character) => [character.id, character]),
    );
    const onEdit = vi.fn<(action: EditAction) => void>();

    render(
      <ScriptEditorPanel
        charactersById={charactersById}
        scene={document.script.scenes[0]}
        selectedBlockId={null}
        onEdit={onEdit}
        onUpdateBlockText={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText('Select block blk_001'));

    expect(onEdit).toHaveBeenCalledWith({ type: 'select-block', blockId: 'blk_001' });
  });
});
