import React from 'react';
import { cn } from '@/lib/utils';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement> & { containerClassName?: string }> = ({
  children,
  className,
  containerClassName,
  ...props
}) => (
  <div className={cn('h-full w-full overflow-auto rounded-card border border-border bg-surface', containerClassName)}>
    <table className={cn('w-full text-left text-sm text-fg tabular-nums', className)} {...props}>
      {children}
    </table>
  </div>
);

export const Thead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className, ...props }) => (
  <thead
    className={cn('sticky top-0 z-10 border-b border-border bg-surface-2 text-xs font-medium text-fg-muted', className)}
    {...props}
  >
    {children}
  </thead>
);

export const Tbody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className, ...props }) => (
  <tbody className={cn('divide-y divide-border', className)} {...props}>
    {children}
  </tbody>
);

export const Tr: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ children, className, ...props }) => (
  <tr className={cn('transition-colors hover:bg-surface-2/60', className)} {...props}>
    {children}
  </tr>
);

type CellExtra = { /** Right-align numbers / money so columns line up. */ numeric?: boolean };

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement> & CellExtra> = ({
  children,
  className,
  numeric,
  ...props
}) => (
  <th scope="col" className={cn('whitespace-nowrap px-4 py-2.5 font-medium', numeric && 'text-right', className)} {...props}>
    {children}
  </th>
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement> & CellExtra> = ({
  children,
  className,
  numeric,
  ...props
}) => (
  <td className={cn('px-4 py-3 text-fg-muted', numeric && 'whitespace-nowrap text-right tabular-nums', className)} {...props}>
    {children}
  </td>
);
