import * as React from 'react';
import { format } from 'date-fns';
import { ElephantMascot } from './ElephantMascot';
import type { ElephantMascotHandle, ElephantMascotProps } from './ElephantMascot';

function computeGreetingAndDate(): { greeting: string; dateStr: string } {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return { greeting, dateStr: format(new Date(), 'EEEE, MMMM d') };
}

type MascotHeaderProps = ElephantMascotProps & {
  elephantRef: React.RefObject<ElephantMascotHandle | null>;
};

export const MascotHeader = ({ headwear, surfing, idleMode, scheduledIdle, appFocused, elephantRef }: MascotHeaderProps): React.JSX.Element => {
  const [{ greeting, dateStr }, setGreetingData] = React.useState(computeGreetingAndDate);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setGreetingData(computeGreetingAndDate());
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

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
