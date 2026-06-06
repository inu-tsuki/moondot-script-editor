import type { ButtonHTMLAttributes } from 'react';
import { cx } from './classNames';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-[#1f7667] text-white hover:bg-[#175f54]',
  secondary: 'border-[#cfc7ba] bg-white text-[#26322d] hover:bg-[#f2ece2]',
  ghost: 'border-transparent bg-transparent text-[#26322d] hover:bg-[#f2ece2]',
};

export function Button({
  className,
  type = 'button',
  variant = 'secondary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        'inline-flex min-h-9 items-center justify-center gap-2 rounded-md border px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
