import * as React from 'react';

type ChartTheme = {
  active: string;
  idle: string;
  grid: string;
  axis: string;
  axisLine: string;
  tooltipBg: string;
  tooltipBorder: string;
  cursorFill: string;
  radialBg: string;
  areaOpacity: number;
  tooltipStyle: React.CSSProperties;
};

function readTheme(): ChartTheme {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string): string => s.getPropertyValue(name).trim();

  const tooltipBg = v('--chart-tooltip-bg') || '#fff';
  const tooltipBorder = v('--chart-tooltip-border') || '#e5e7eb';

  return {
    active: v('--chart-active') || '#6366f1',
    idle: v('--chart-idle') || '#e0e7ff',
    grid: v('--chart-grid') || '#f3f4f6',
    axis: v('--chart-axis') || '#9ca3af',
    axisLine: v('--chart-axis-line') || '#e5e7eb',
    tooltipBg,
    tooltipBorder,
    cursorFill: v('--chart-cursor-fill') || 'rgba(0,0,0,0.02)',
    radialBg: v('--chart-radial-bg') || '#f9fafb',
    areaOpacity: parseFloat(v('--chart-area-opacity')) || 0.2,
    tooltipStyle: {
      border: `1px solid ${tooltipBorder}`,
      borderRadius: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      background: tooltipBg,
      color: v('--chart-axis') || '#9ca3af',
      fontSize: 11,
      fontFamily: 'JetBrains Mono, monospace',
      padding: '8px 12px'
    }
  };
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = React.useState<ChartTheme>(readTheme);

  React.useEffect(() => {
    const update = (): void => setTheme(readTheme());

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}
