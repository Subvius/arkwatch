import * as React from 'react';
import { cn } from '../../lib/utils';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton = ({ className, ...props }: SkeletonProps): React.JSX.Element => {
  return (
    <div
      className={cn('skeleton rounded-md bg-[hsl(var(--border))]', className)}
      {...props}
    />
  );
};
