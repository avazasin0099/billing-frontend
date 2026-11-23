import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NumberInput } from './number-input';

/** Shared control styling — every text input, select and textarea looks the same. */
export const controlClass =
  'w-full rounded-control border bg-surface text-sm text-fg placeholder:text-fg-subtle ' +
  'transition-colors duration-150 ' +
  'focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary ' +
  'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-fg-subtle';

interface FieldShellProps {
  id: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + hint/error, wired together with htmlFor / aria-describedby. */
const FieldShell: React.FC<FieldShellProps> = ({ id, label, hint, error, required, className, children }) => (
  <div className={cn('w-full', className)}>
    {label && (
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
    )}
    {children}
    {error ? (
      <p id={`${id}-error`} className="mt-1.5 text-xs text-danger" role="alert">
        {error}
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-fg-subtle">
        {hint}
      </p>
    ) : null}
  </div>
);

const describedBy = (id: string, error?: React.ReactNode, hint?: React.ReactNode) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Leading icon (decorative). */
  icon?: React.ReactNode;
  /** Trailing element, e.g. a <kbd> hint or unit. */
  suffix?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, icon, suffix, className, containerClassName, id, required, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    const Tag: any = props.type === 'number' ? NumberInput : 'input';
    return (
      <FieldShell id={inputId} label={label} hint={hint} error={error} required={required} className={containerClassName}>
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-fg-subtle [&_svg]:size-4" aria-hidden="true">
              {icon}
            </span>
          )}
          <Tag
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(inputId, error, hint)}
            className={cn(
              controlClass,
              'h-10 px-3',
              icon && 'pl-9',
              suffix && 'pr-12',
              error ? 'border-danger' : 'border-border-strong',
              className
            )}
            {...props}
          />
          {suffix && <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-fg-subtle">{suffix}</span>}
        </div>
      </FieldShell>
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  icon?: React.ReactNode;
  containerClassName?: string;
}

/** Native <select> (keyboard + screen-reader friendly) with the standard control styling. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, icon, className, containerClassName, id, required, children, ...props }, ref) => {
    const autoId = React.useId();
    const selectId = id ?? autoId;
    return (
      <FieldShell id={selectId} label={label} hint={hint} error={error} required={required} className={containerClassName}>
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-fg-subtle [&_svg]:size-4" aria-hidden="true">
              {icon}
            </span>
          )}
          <select
            ref={ref}
            id={selectId}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(selectId, error, hint)}
            className={cn(
              controlClass,
              'h-10 appearance-none pl-3 pr-9',
              icon && 'pl-9',
              error ? 'border-danger' : 'border-border-strong',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
        </div>
      </FieldShell>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className, containerClassName, id, required, rows = 3, ...props }, ref) => {
    const autoId = React.useId();
    const areaId = id ?? autoId;
    return (
      <FieldShell id={areaId} label={label} hint={hint} error={error} required={required} className={containerClassName}>
        <textarea
          ref={ref}
          id={areaId}
          rows={rows}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(areaId, error, hint)}
          className={cn(controlClass, 'px-3 py-2', error ? 'border-danger' : 'border-border-strong', className)}
          {...props}
        />
      </FieldShell>
    );
  }
);
Textarea.displayName = 'Textarea';
