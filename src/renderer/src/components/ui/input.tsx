import * as React from 'react';
import { cn } from '@renderer/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-11 w-full border-4 border-[hsl(var(--line))] bg-[hsl(var(--panel))] px-3 py-2 text-sm placeholder:text-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]',
      className
    )}
    {...props}
  />
));

Input.displayName = 'Input';

export { Input };
