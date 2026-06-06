import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './classNames';

type TabItem = {
  id: string;
  label: ReactNode;
};

type TabsProps = HTMLAttributes<HTMLDivElement> & {
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  tabs: TabItem[];
};

export function Tabs({ activeTabId, className, onTabChange, tabs, ...props }: TabsProps) {
  return (
    <div className={cx('flex flex-wrap gap-1 rounded-md bg-[#f2ece2] p-1', className)} {...props}>
      {tabs.map((tab) => (
        <button
          className={cx(
            'min-h-8 rounded px-2.5 text-xs font-extrabold',
            activeTabId === tab.id
              ? 'bg-white text-[#17211d] shadow-sm'
              : 'bg-transparent text-[#66716b] hover:bg-[#fffaf2]',
          )}
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
