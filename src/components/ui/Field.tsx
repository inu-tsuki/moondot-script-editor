import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './classNames';

type FieldProps = HTMLAttributes<HTMLLabelElement> & {
  label: ReactNode;
  wide?: boolean;
};

export const fieldControlClassName =
  'min-h-8 min-w-0 rounded-md border border-[#cfc7ba] bg-white px-2 text-[#17211d]';

export function Field({ children, className, label, wide = false, ...props }: FieldProps) {
  return (
    <label className={cx('grid min-w-0 gap-[5px]', wide && 'col-span-full', className)} {...props}>
      <span className="text-[11px] font-extrabold text-[#5f6b64]">{label}</span>
      {children}
    </label>
  );
}
