import { ChevronDown, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Button, PanelTitle } from '../../components/ui';
import type { CharacterProfile, SceneNode } from '../../core/screenplay';

type EditorHeaderProps = {
  scenes: SceneNode[];
  activeSceneIndex: number;
  onSelectScene: (index: number) => void;
  allCharacters: CharacterProfile[];
  hasActiveScene: boolean;
  onAppendBlock: (type: string) => void;
};

const blockTypeLabels: Record<string, string> = {
  action: 'Action',
  dialogue: 'Dialogue',
  narration: 'Narration',
  transition: 'Transition',
  note: 'Note',
};

const blockTypes = ['action', 'dialogue', 'narration', 'transition', 'note'] as const;

const hasNoCharacters = (characters: CharacterProfile[]) => characters.length === 0;

/**
 * Unified editor header — combines scene navigation tabs with block
 * insertion controls so the editor workspace reads as a single document
 * surface rather than a patchwork of external panels.
 */
export function EditorHeader({
  scenes,
  activeSceneIndex,
  onSelectScene,
  allCharacters,
  hasActiveScene,
  onAppendBlock,
}: EditorHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const showSceneTabs = scenes.length > 1;

  return (
    <header className="flex min-h-12 items-center gap-3 border-b border-[#e4ded3] bg-[#faf9f6] px-5">
      {/* ── Scene tabs (left) ── */}
      {showSceneTabs && (
        <nav aria-label="场景导航" className="flex flex-wrap items-center gap-1">
          {scenes.map((scene, index) => (
            <button
              key={scene.id}
              className={
                index === activeSceneIndex
                  ? 'rounded bg-[#f2ece2] px-2.5 py-1 text-xs font-extrabold text-[#17211d]'
                  : 'rounded bg-transparent px-2.5 py-1 text-xs font-extrabold text-[#66716b] hover:bg-[#f2ece2]'
              }
              type="button"
              onClick={() => onSelectScene(index)}
            >
              Scene {index + 1} · {scene.title}
            </button>
          ))}
        </nav>
      )}

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Editor title + block actions (right) ── */}
      <PanelTitle icon={<Sparkles size={16} />}>Semantic Blocks</PanelTitle>
      <div className="relative">
        <Button
          disabled={!hasActiveScene}
          onClick={() => setMenuOpen((prev) => !prev)}
          title="增加语义块"
        >
          <Plus size={16} />
          Block
          <ChevronDown size={12} />
        </Button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-10 mt-1 flex flex-col rounded-md border border-[#cfc7ba] bg-white py-1 shadow-sm">
            {blockTypes.map((type) => {
              const disabled = type === 'dialogue' && hasNoCharacters(allCharacters);
              return (
                <button
                  key={type}
                  className={`whitespace-nowrap px-3 py-1.5 text-left text-xs leading-none ${
                    disabled
                      ? 'cursor-not-allowed text-[#b0b0b0]'
                      : 'text-[#26322d] hover:bg-[#f2ece2]'
                  }`}
                  disabled={disabled}
                  onClick={() => {
                    onAppendBlock(type);
                    setMenuOpen(false);
                  }}
                  title={disabled ? '当前 document 没有角色，无法创建 Dialogue 块' : undefined}
                  type="button"
                >
                  {blockTypeLabels[type]}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
