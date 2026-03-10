import * as React from 'react';

type LegendItem = {
  color: string;
  label: string;
};

type ChartLegendProps = {
  items: LegendItem[];
};

export const ChartLegend = ({ items }: ChartLegendProps): React.JSX.Element => {
  return (
    <div className="flex items-center gap-4">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[11px]">
          <span
            className="inline-block h-2.5 w-2.5 rounded-[2px]"
            style={{ background: item.color }}
          />
          <span className="text-[hsl(var(--muted))]">{item.label}</span>
        </span>
      ))}
    </div>
  );
};
