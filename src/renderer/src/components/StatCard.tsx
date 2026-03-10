import * as React from 'react';

type StatCardProps = {
  label: string;
  value: string;
  sublabel?: string;
};

export const StatCard = ({ label, value, sublabel }: StatCardProps): React.JSX.Element => {
  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-[hsl(var(--muted))]">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-[hsl(var(--muted))]">{sublabel}</p>}
    </div>
  );
};
