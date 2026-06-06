import type { HTMLAttributes } from 'react';
import { cx } from './classNames';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'dark' | 'accent';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'border-[#d9d1c4] bg-white text-[#5f6b64]',
  success: 'border-[#b8d8ce] bg-[#e6f3ee] text-[#2f665c]',
  warning: 'border-[#ebce7a] bg-[#fff6db] text-[#5e4a15]',
  error: 'border-[#e2a27e] bg-[#fff0e8] text-[#8a4b2d]',
  dark: 'border-transparent bg-[#26322d] text-white',
  accent: 'border-[#c2ded4] bg-[#e6f3ee] text-[#2f665c]',
};

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded border px-1.5 py-[3px] text-[11px] font-extrabold leading-none',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
