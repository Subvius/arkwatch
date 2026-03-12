import * as React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useClickOutside } from '../../hooks/useClickOutside';

type MorphingDialogContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  uniqueId: string;
  dialogId: string;
  titleId: string;
  descriptionId: string;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  ready: boolean;
  markReady: () => void;
};

const MorphingDialogContext = React.createContext<MorphingDialogContextValue | null>(null);

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.hasAttribute('disabled')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (el.tabIndex < 0) return false;
    return true;
  });
}

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
  const dialogId = `${uniqueId}-dialog`;
  const titleId = `${uniqueId}-title`;
  const descriptionId = `${uniqueId}-description`;
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const wasOpenRef = React.useRef(false);

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

  React.useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      window.requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, triggerRef]);

  const ctx = React.useMemo(
    () => ({
      isOpen,
      setIsOpen,
      uniqueId,
      dialogId,
      titleId,
      descriptionId,
      triggerRef,
      ready,
      markReady,
    }),
    [isOpen, setIsOpen, uniqueId, dialogId, titleId, descriptionId, triggerRef, ready, markReady]
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
  const { setIsOpen, uniqueId, isOpen, triggerRef, dialogId } = useMorphingDialog();
  const handleOpen = React.useCallback(() => setIsOpen(true), [setIsOpen]);

  return (
    <motion.div
      ref={(node) => {
        triggerRef.current = node;
      }}
      layoutId={`morphing-dialog-${uniqueId}`}
      className={cn('cursor-pointer', className)}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      }}
      style={isOpen ? { opacity: 0 } : undefined}
      role="button"
      tabIndex={isOpen ? -1 : 0}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-controls={dialogId}
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
  const { setIsOpen, uniqueId, isOpen, dialogId, titleId, descriptionId, ready, markReady } = useMorphingDialog();
  const ref = React.useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false));

  React.useEffect(() => {
    if (!isOpen || !ref.current) return;

    const container = ref.current;
    const focusable = getFocusableElements(container);
    const initialFocus = focusable[0] ?? container;
    initialFocus.focus();

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;

      const nodes = getFocusableElements(container);
      if (nodes.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (!active || !container.contains(active) || active === first) {
          e.preventDefault();
          last.focus();
        }
        return;
      }

      if (!active || !container.contains(active) || active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <motion.div
      ref={ref}
      id={dialogId}
      layoutId={`morphing-dialog-${uniqueId}`}
      className={cn('z-50 pointer-events-auto', ready ? 'overflow-y-auto' : 'overflow-hidden', className)}
      onLayoutAnimationComplete={markReady}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      tabIndex={-1}
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
  const { titleId } = useMorphingDialog();

  return (
    <h3 id={titleId} className={cn('text-lg font-semibold', className)}>
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
  const { ready, descriptionId } = useMorphingDialog();

  return (
    <motion.div
      id={descriptionId}
      animate={{ opacity: ready ? 1 : 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
