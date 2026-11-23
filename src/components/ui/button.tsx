import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link' | 'outline' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium rounded-control ' +
  'transition-colors duration-150 select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface ' +
  'disabled:opacity-50 disabled:pointer-events-none [&_svg]:shrink-0';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-sm',
  secondary: 'bg-surface text-fg border border-border-strong hover:bg-surface-2 shadow-sm',
  // `outline` kept as an alias of secondary for existing call sites.
  outline: 'bg-surface text-fg border border-border-strong hover:bg-surface-2',
  ghost: 'bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger text-white hover:bg-danger-hover shadow-sm',
  // `success` is a status colour, not an action colour — map it to the primary action.
  success: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-sm',
  link: 'bg-transparent text-accent underline-offset-4 hover:underline px-0 h-auto text-sm [&_svg]:size-4',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm [&_svg]:size-4',
  md: 'h-10 px-4 text-sm [&_svg]:size-4',
  lg: 'h-12 px-5 text-base [&_svg]:size-5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, variant = 'primary', size = 'md', isLoading = false, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], variant !== 'link' && sizes[size], className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Required: icon-only buttons must have an accessible name. Also shown as the tooltip. */
  label: string;
  variant?: 'ghost' | 'secondary' | 'danger-ghost';
  size?: 'sm' | 'md' | 'lg';
}

const iconVariants = {
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  secondary: 'bg-surface text-fg border border-border-strong hover:bg-surface-2',
  'danger-ghost': 'text-fg-muted hover:bg-danger-soft hover:text-danger',
};

const iconSizes = {
  sm: 'size-8 [&_svg]:size-4',
  md: 'size-10 [&_svg]:size-[18px]',
  lg: 'size-11 [&_svg]:size-5', // 44px touch target
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, variant = 'ghost', size = 'md', className, children, type, title, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? 'button'}
      aria-label={label}
      title={title ?? label}
      className={cn(
        'inline-flex items-center justify-center rounded-control transition-colors duration-150 shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:opacity-50 disabled:pointer-events-none',
        iconVariants[variant],
        iconSizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
IconButton.displayName = 'IconButton';
