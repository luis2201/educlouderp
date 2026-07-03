import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const alertVariants = cva('rounded-md border px-4 py-3 text-sm', {
  variants: {
    variant: {
      info: 'border-[hsl(var(--brand-sky)/0.32)] bg-[hsl(var(--brand-sky)/0.1)] text-primary',
      success:
        'border-[hsl(var(--brand-green)/0.34)] bg-[hsl(var(--brand-green)/0.12)] text-[hsl(116_48%_28%)]',
      warning: 'border-amber-300/70 bg-amber-50 text-amber-900',
      destructive: 'border-destructive/30 bg-destructive/10 text-destructive'
    }
  },
  defaultVariants: {
    variant: 'info'
  }
});

type AlertProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>;

function Alert({ className, variant, ...props }: AlertProps) {
  return <div className={cn(alertVariants({ variant, className }))} role="status" {...props} />;
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('font-semibold leading-5', className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 leading-5 opacity-85', className)} {...props} />;
}

export { Alert, AlertDescription, AlertTitle };
