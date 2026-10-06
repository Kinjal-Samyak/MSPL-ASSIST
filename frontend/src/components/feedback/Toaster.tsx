import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToastStore, type ToastItem, type ToastVariant } from '@/store/toastStore';
import { Z_INDEX } from '@/themes/tokens';
import { cn } from '@/utils';

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; iconClass: string; barClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    barClass: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-600 dark:text-red-400',
    barClass: 'bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600 dark:text-amber-400',
    barClass: 'bg-amber-500',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-600 dark:text-blue-400',
    barClass: 'bg-blue-500',
  },
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(toast.durationMs);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 180);
  };

  const startTimer = (durationMs: number) => {
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(close, durationMs);
  };

  useEffect(() => {
    startTimer(remainingRef.current);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pause = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      remainingRef.current -= Date.now() - startedAtRef.current;
    }
  };

  const resume = () => {
    if (remainingRef.current > 0) {
      startTimer(remainingRef.current);
    }
  };

  const { icon: Icon, iconClass, barClass } = VARIANT_CONFIG[toast.variant];

  return (
    <div
      role="status"
      onMouseEnter={pause}
      onMouseLeave={resume}
      className={cn(
        'pointer-events-auto relative flex w-96 max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/10 transition-all duration-200 ease-out motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30',
        visible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', barClass)} aria-hidden="true" />
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconClass)} aria-hidden="true" />
      <div className="flex-1 pl-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed right-4 top-4 flex flex-col gap-2"
      style={{ zIndex: Z_INDEX.toast }}
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} toast={item} onDismiss={dismiss} />
      ))}
    </div>
  );
}
