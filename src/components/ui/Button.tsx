import type { ButtonHTMLAttributes } from 'react';
import { cx } from './classNames';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'default' | 'icon-sm';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-[#1f7667] text-white hover:bg-[#175f54]',
  secondary: 'border-[#cfc7ba] bg-white text-[#26322d] hover:bg-[#f2ece2]',
  ghost: 'border-transparent bg-transparent text-[#26322d] hover:bg-[#f2ece2]',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'min-h-9 px-3',
  'icon-sm': 'min-h-7 w-7 p-0',
};

export function Button({
  className,
  size = 'default',
  type = 'button',
  variant = 'secondary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md border font-semibold disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
