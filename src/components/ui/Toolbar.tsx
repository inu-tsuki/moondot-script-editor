import type { HTMLAttributes } from 'react';
import { cx } from './classNames';

export function Toolbar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('flex flex-wrap items-center justify-end gap-2', className)} {...props} />
  );
}
