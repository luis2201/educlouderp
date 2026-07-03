import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex min-h-6 items-center rounded-sm border px-2 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'border-primary/20 bg-primary/10 text-primary',
        sky: 'border-[hsl(var(--brand-sky)/0.28)] bg-[hsl(var(--brand-sky)/0.12)] text-primary',
        green:
          'border-[hsl(var(--brand-green)/0.28)] bg-[hsl(var(--brand-green)/0.12)] text-[hsl(116_48%_28%)]',
        warning: 'border-amber-300/70 bg-amber-50 text-amber-900',
        muted: 'border-border bg-muted text-muted-foreground'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge };
