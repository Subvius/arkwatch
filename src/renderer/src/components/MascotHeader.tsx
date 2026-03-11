import * as React from 'react';
import { format } from 'date-fns';
import { ElephantMascot } from './ElephantMascot';
import type { ElephantMascotHandle, ElephantMascotProps } from './ElephantMascot';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

type MascotHeaderProps = ElephantMascotProps & {
  elephantRef: React.RefObject<ElephantMascotHandle | null>;
};

export const MascotHeader = ({ headwear, surfing, idleMode, scheduledIdle, appFocused, elephantRef }: MascotHeaderProps): React.JSX.Element => {
  const greeting = React.useMemo(() => getGreeting(), []);
  const dateStr = React.useMemo(() => format(new Date(), 'EEEE, MMMM d'), []);

  return (
    <div className="flex items-center justify-between py-1">
      <ElephantMascot ref={elephantRef} headwear={headwear} surfing={surfing} idleMode={idleMode} scheduledIdle={scheduledIdle} appFocused={appFocused} />
      <div className="text-right">
        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{greeting}</p>
        <p className="text-xs text-[hsl(var(--muted))]">{dateStr}</p>
      </div>
    </div>
  );
};
