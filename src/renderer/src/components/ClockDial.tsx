import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { AnimatedNumber } from './AnimatedNumber';

type ClockDialProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (durationSec: number) => void;
};

const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 80;
const HANDLE_RADIUS = 10;
const MIN_MINUTES = 1;
const MAX_MINUTES = 180;
const SNAP = 1;

const angleToMinutes = (angle: number): number => {
  // angle 0 = 12 o'clock, clockwise
  const raw = (angle / (2 * Math.PI)) * MAX_MINUTES;
  const snapped = Math.round(raw / SNAP) * SNAP;
  return Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, snapped));
};

const minutesToAngle = (minutes: number): number => {
  return (minutes / MAX_MINUTES) * 2 * Math.PI;
};

const polarToCartesian = (angle: number): { x: number; y: number } => {
  return {
    x: CX + RADIUS * Math.sin(angle),
    y: CY - RADIUS * Math.cos(angle)
  };
};

const describeArc = (startAngle: number, endAngle: number): string => {
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
};

export const ClockDial = ({ open, onOpenChange, onStart }: ClockDialProps): React.JSX.Element => {
  const [minutes, setMinutes] = React.useState(25);
  const [dragging, setDragging] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const angle = minutesToAngle(minutes);
  const handlePos = polarToCartesian(angle);

  const getAngleFromEvent = React.useCallback((clientX: number, clientY: number): number => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const x = clientX - rect.left - CX * (rect.width / SIZE);
    const y = clientY - rect.top - CY * (rect.height / SIZE);
    let a = Math.atan2(x, -y);
    if (a < 0) a += 2 * Math.PI;
    return a;
  }, []);

  const handlePointerDown = React.useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = React.useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const a = getAngleFromEvent(e.clientX, e.clientY);
    setMinutes(angleToMinutes(a));
  }, [dragging, getAngleFromEvent]);

  const handlePointerUp = React.useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Custom Focus Timer</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative h-[200px] w-[200px]">
            <svg
              ref={svgRef}
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="select-none"
            >
              <circle
                cx={CX}
                cy={CY}
                r={RADIUS}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth={8}
                strokeLinecap="round"
              />

              {minutes > 0 && (
                <path
                  d={describeArc(0, angle)}
                  fill="none"
                  stroke="hsl(var(--accent))"
                  strokeWidth={8}
                  strokeLinecap="round"
                />
              )}

              <circle
                cx={handlePos.x}
                cy={handlePos.y}
                r={HANDLE_RADIUS}
                fill="hsl(var(--accent))"
                stroke="hsl(var(--panel))"
                strokeWidth={3}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-[hsl(var(--ink))]">
                <AnimatedNumber value={minutes} springOptions={{ stiffness: 260, damping: 24 }} />
              </span>
              <span className="text-xs text-[hsl(var(--muted))]">min</span>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => {
              onStart(minutes * 60);
              onOpenChange(false);
            }}
          >
            Start Focus
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
