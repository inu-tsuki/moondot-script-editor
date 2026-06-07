import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ScriptEditorPanel } from '../../src/features/editor/ScriptEditorPanel';
import { demoScreenplayDocument } from '../../src/core/screenplay';
import type { EditAction, ScreenplayDocument } from '../../src/core/screenplay';

const cloneDocument = (): ScreenplayDocument => structuredClone(demoScreenplayDocument);

describe('ScriptEditorPanel', () => {
  it('disables dialogue creation when the document has no characters', async () => {
    const user = userEvent.setup();
    const document = cloneDocument();
    document.characters = [];
    const onEdit = vi.fn<(action: EditAction) => void>();

    render(
      <ScriptEditorPanel
        charactersById={new Map()}
        scene={document.script.scenes[0]}
        selectedBlockId={null}
        onEdit={onEdit}
        onUpdateBlockText={vi.fn()}
      />,
    );

    await user.click(screen.getByTitle('增加语义块'));

    const dialogueButton = screen.getByRole('button', { name: 'Dialogue' });
    expect(dialogueButton).toBeDisabled();

    await user.click(dialogueButton);
    expect(onEdit).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'append-block' }));
  });
});
