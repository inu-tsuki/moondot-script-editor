import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './classNames';

type PanelShellProps = HTMLAttributes<HTMLElement> & {
  as?: 'article' | 'section';
};

type PanelTitleProps = HTMLAttributes<HTMLDivElement> & {
  icon?: ReactNode;
};

export function PanelShell({ as: Component = 'section', className, ...props }: PanelShellProps) {
  return (
    <Component
      className={cx(
        'flex min-h-0 flex-col overflow-hidden rounded-lg border border-[#d9d1c4] bg-[#fffdf8] max-[760px]:min-h-[360px]',
        className,
      )}
      {...props}
    />
  );
}

export function PanelHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        'flex min-h-12 items-center justify-between gap-2.5 border-b border-[#e6ded2] px-3.5',
        className,
      )}
      {...props}
    />
  );
}

export function PanelTitle({ children, className, icon, ...props }: PanelTitleProps) {
  return (
    <div
      className={cx('flex items-center gap-2 text-sm font-extrabold text-[#17211d]', className)}
      {...props}
    >
      {icon}
      {children}
    </div>
  );
}

export function PanelMeta({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('whitespace-nowrap text-xs text-[#6c776f]', className)} {...props} />;
}

export function PanelBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('flex min-h-0 flex-1 flex-col gap-3 p-3.5', className)} {...props} />;
}
