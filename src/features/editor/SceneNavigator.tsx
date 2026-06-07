import type { SceneNode } from '../../core/screenplay';

type SceneNavigatorProps = {
  scenes: SceneNode[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

export function SceneNavigator({ scenes, activeIndex, onSelect }: SceneNavigatorProps) {
  if (scenes.length <= 1) return null;

  return (
    <nav aria-label="场景导航" className="flex flex-wrap gap-1 rounded-md bg-[#f2ece2] p-1">
      {scenes.map((scene, index) => (
        <button
          key={scene.id}
          className={
            index === activeIndex
              ? 'min-h-8 rounded bg-white px-2.5 text-xs font-extrabold text-[#17211d] shadow-sm'
              : 'min-h-8 rounded bg-transparent px-2.5 text-xs font-extrabold text-[#66716b] hover:bg-[#fffaf2]'
          }
          type="button"
          onClick={() => onSelect(index)}
        >
          Scene {index + 1} · {scene.title}
        </button>
      ))}
    </nav>
  );
}
