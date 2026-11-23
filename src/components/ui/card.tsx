import React from 'react';
import { cn } from '@/lib/utils';

// Form controls live in field.tsx; re-exported here so existing imports keep working.
export { Input, Select, Textarea, type InputProps } from './field';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { padded?: boolean }> = ({
  children,
  className,
  padded = true,
  ...props
}) => (
  <div className={cn('rounded-card border border-border bg-surface text-fg shadow-sm', padded && 'p-5', className)} {...props}>
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
  <div className={cn('mb-4 flex items-center justify-between gap-3 border-b border-border pb-4', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, className, ...props }) => (
  <h3 className={cn('text-base font-semibold text-fg', className)} {...props}>
    {children}
  </h3>
);

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' | 'highlight';

const badgeStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/20',
  danger: 'bg-danger-soft text-danger border-danger/20',
  info: 'bg-info-soft text-info border-info/20',
  primary: 'bg-primary-soft text-accent border-accent/20',
  neutral: 'bg-surface-2 text-fg-muted border-border',
  highlight: 'bg-highlight text-highlight-fg border-black/10',
};

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  className?: string;
}> = ({ children, variant = 'neutral', icon, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium [&_svg]:size-3.5',
      badgeStyles[variant],
      className
    )}
  >
    {icon}
    {children}
  </span>
);
