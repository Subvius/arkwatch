import * as React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useClickOutside } from '../../hooks/useClickOutside';

type MorphingDialogContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  uniqueId: string;
  ready: boolean;
  markReady: () => void;
};

const MorphingDialogContext = React.createContext<MorphingDialogContextValue | null>(null);

function useMorphingDialog(): MorphingDialogContextValue {
  const ctx = React.useContext(MorphingDialogContext);
  if (!ctx) throw new Error('MorphingDialog compound components must be used within <MorphingDialog>');
  return ctx;
}

/** Hook for children that need to know when the morph-in animation is done. */
export function useMorphingDialogReady(): boolean {
  const ctx = React.useContext(MorphingDialogContext);
  return ctx?.ready ?? false;
}

export function MorphingDialog({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isOpen, setIsOpenRaw] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const uniqueId = React.useId();

  const setIsOpen = React.useCallback((open: boolean) => {
    if (!open) setReady(false);
    setIsOpenRaw(open);
  }, []);

  const markReady = React.useCallback(() => setReady(true), []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, setIsOpen]);

  const ctx = React.useMemo(
    () => ({ isOpen, setIsOpen, uniqueId, ready, markReady }),
    [isOpen, setIsOpen, uniqueId, ready, markReady]
  );

  return (
    <MorphingDialogContext.Provider value={ctx}>
      {children}
    </MorphingDialogContext.Provider>
  );
}

export function MorphingDialogTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  const { setIsOpen, uniqueId, isOpen } = useMorphingDialog();
  return (
    <motion.div
      layoutId={`morphing-dialog-${uniqueId}`}
      className={cn('cursor-pointer', className)}
      onClick={() => setIsOpen(true)}
      style={isOpen ? { opacity: 0 } : undefined}
    >
      {children}
    </motion.div>
  );
}

export function MorphingDialogContainer({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { isOpen, setIsOpen } = useMorphingDialog();

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="fixed inset-0 z-50 bg-[hsl(var(--panel))]/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15, ease: 'easeIn' } }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function MorphingDialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  const { setIsOpen, uniqueId, ready, markReady } = useMorphingDialog();
  const ref = React.useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false));

  return (
    <motion.div
      ref={ref}
      layoutId={`morphing-dialog-${uniqueId}`}
      className={cn('z-50 pointer-events-auto', ready ? 'overflow-y-auto' : 'overflow-hidden', className)}
      onLayoutAnimationComplete={markReady}
    >
      {children}
    </motion.div>
  );
}

export function MorphingDialogClose({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  const { setIsOpen } = useMorphingDialog();
  return (
    <button
      type="button"
      className={cn(className)}
      onClick={() => setIsOpen(false)}
      aria-label="Close dialog"
    >
      {children}
    </button>
  );
}

export function MorphingDialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <h3 className={cn('text-lg font-semibold', className)}>
      {children}
    </h3>
  );
}

export function MorphingDialogSubtitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <p className={cn('text-sm text-[hsl(var(--muted))]', className)}>
      {children}
    </p>
  );
}

export function MorphingDialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  const { ready } = useMorphingDialog();

  return (
    <motion.div
      animate={{ opacity: ready ? 1 : 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
