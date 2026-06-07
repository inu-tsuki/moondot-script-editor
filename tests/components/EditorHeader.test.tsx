import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EditorHeader } from '../../src/features/editor/EditorHeader';
import type { CharacterProfile } from '../../src/core/screenplay';

describe('EditorHeader', () => {
  const twoScenes = [
    {
      id: 'scene_1',
      title: '开场',
      heading: { locationType: 'INT' as const, location: '咖啡厅', timeOfDay: '日' },
      blocks: [],
      synopsis: '',
    },
    {
      id: 'scene_2',
      title: '冲突',
      heading: { locationType: 'EXT' as const, location: '街道', timeOfDay: '夜' },
      blocks: [],
      synopsis: '',
    },
  ];

  const characters: CharacterProfile[] = [{ id: 'char_1', name: '小明', aliases: [] }];

  it('renders "Semantic Blocks" title and "+ Block" button', () => {
    render(
      <EditorHeader
        scenes={twoScenes}
        activeSceneIndex={0}
        onSelectScene={vi.fn()}
        allCharacters={characters}
        hasActiveScene
        onAppendBlock={vi.fn()}
      />,
    );

    expect(screen.getByText('Semantic Blocks')).toBeInTheDocument();
    expect(screen.getByTitle('增加语义块')).toBeInTheDocument();
  });

  it('renders scene tabs when there are multiple scenes', () => {
    render(
      <EditorHeader
        scenes={twoScenes}
        activeSceneIndex={0}
        onSelectScene={vi.fn()}
        allCharacters={characters}
        hasActiveScene
        onAppendBlock={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /开场/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /冲突/ })).toBeInTheDocument();
  });

  it('hides scene tabs when there is only one scene', () => {
    render(
      <EditorHeader
        scenes={[twoScenes[0]]}
        activeSceneIndex={0}
        onSelectScene={vi.fn()}
        allCharacters={characters}
        hasActiveScene
        onAppendBlock={vi.fn()}
      />,
    );

    // The nav should not be rendered when scenes.length <= 1
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('calls onSelectScene when a scene tab is clicked', async () => {
    const user = userEvent.setup();
    const onSelectScene = vi.fn();

    render(
      <EditorHeader
        scenes={twoScenes}
        activeSceneIndex={0}
        onSelectScene={onSelectScene}
        allCharacters={characters}
        hasActiveScene
        onAppendBlock={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /冲突/ }));
    expect(onSelectScene).toHaveBeenCalledWith(1);
  });

  it('disables "+ Block" button when there is no active scene', () => {
    render(
      <EditorHeader
        scenes={twoScenes}
        activeSceneIndex={0}
        onSelectScene={vi.fn()}
        allCharacters={characters}
        hasActiveScene={false}
        onAppendBlock={vi.fn()}
      />,
    );

    expect(screen.getByTitle('增加语义块')).toBeDisabled();
  });

  it('disables dialogue option when document has no characters', async () => {
    const user = userEvent.setup();

    render(
      <EditorHeader
        scenes={twoScenes}
        activeSceneIndex={0}
        onSelectScene={vi.fn()}
        allCharacters={[]}
        hasActiveScene
        onAppendBlock={vi.fn()}
      />,
    );

    await user.click(screen.getByTitle('增加语义块'));

    const dialogueButton = screen.getByRole('button', { name: 'Dialogue' });
    expect(dialogueButton).toBeDisabled();
  });

  it('calls onAppendBlock with the correct block type', async () => {
    const user = userEvent.setup();
    const onAppendBlock = vi.fn();

    render(
      <EditorHeader
        scenes={twoScenes}
        activeSceneIndex={0}
        onSelectScene={vi.fn()}
        allCharacters={characters}
        hasActiveScene
        onAppendBlock={onAppendBlock}
      />,
    );

    await user.click(screen.getByTitle('增加语义块'));
    await user.click(screen.getByRole('button', { name: 'Action' }));

    expect(onAppendBlock).toHaveBeenCalledWith('action');
  });
});
