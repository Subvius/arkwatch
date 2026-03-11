import * as React from 'react';
import { cn } from '@renderer/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-9 w-full rounded-md border bg-[hsl(var(--panel))] px-3 py-1.5 text-sm text-[hsl(var(--ink))] placeholder:text-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-1 focus-visible:ring-offset-[hsl(var(--panel))]',
      className
    )}
    {...props}
  />
));

Input.displayName = 'Input';

export { Input };
