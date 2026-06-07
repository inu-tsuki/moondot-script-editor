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
 *
 * Responsive behaviour:
 * - Wide viewports: scene tabs (left, scrollable when too many) + controls (right, fixed)
 * - Narrow (< 500px): controls on top row, scene tabs on second row with horizontal scroll
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
    <header className="flex min-h-12 items-center gap-3 border-b border-[#e4ded3] bg-[#faf9f6] px-5 max-[500px]:flex-wrap">
      {/* ── Scene tabs (left) ── */}
      {showSceneTabs && (
        <nav
          aria-label="场景导航"
          className="min-w-0 flex-1 overflow-x-auto max-[500px]:order-3 max-[500px]:flex-[1_1_100%]"
        >
          <div className="flex items-center gap-1">
            {scenes.map((scene, index) => (
              <button
                key={scene.id}
                className={
                  index === activeSceneIndex
                    ? 'whitespace-nowrap rounded bg-[#f2ece2] px-2.5 py-1 text-xs font-extrabold text-[#17211d] max-w-[160px] truncate'
                    : 'whitespace-nowrap rounded bg-transparent px-2.5 py-1 text-xs font-extrabold text-[#66716b] hover:bg-[#f2ece2] max-w-[160px] truncate'
                }
                type="button"
                onClick={() => onSelectScene(index)}
              >
                Scene {index + 1} · {scene.title}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* ── Spacer (collapses to 0 when nav is wide, hidden when wrapped) ── */}
      <div className="flex-1 max-[500px]:hidden" />

      {/* ── Editor title + block actions (right) ── */}
      <div className="flex shrink-0 items-center gap-3 max-[500px]:order-2">
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
      </div>
    </header>
  );
}
