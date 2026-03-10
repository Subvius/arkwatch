import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@renderer/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap border-4 border-[hsl(var(--line))] text-sm font-bold transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 active:translate-x-1 active:translate-y-1',
  {
    variants: {
      variant: {
        default: 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-ink))] shadow-[6px_6px_0_0_hsl(var(--ink))] hover:brightness-95',
        ghost: 'bg-transparent text-[hsl(var(--ink))] shadow-[6px_6px_0_0_hsl(var(--ink))] hover:bg-[hsl(var(--muted))]',
        destructive: 'bg-[#b91c1c] text-white shadow-[6px_6px_0_0_hsl(var(--ink))] hover:brightness-110'
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 px-3',
        lg: 'h-12 px-8'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
));
Button.displayName = 'Button';

export { Button, buttonVariants };
