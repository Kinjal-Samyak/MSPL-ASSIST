import { useToastStore, type ToastVariant } from '@/store/toastStore';

interface ToastOptions {
  description?: string;
  durationMs?: number;
}

function show(variant: ToastVariant, title: string, options?: ToastOptions): string {
  return useToastStore.getState().show({
    variant,
    title,
    description: options?.description,
    durationMs: options?.durationMs,
  });
}

export const toast = {
  success: (title: string, options?: ToastOptions) => show('success', title, options),
  error: (title: string, options?: ToastOptions) => show('error', title, options),
  warning: (title: string, options?: ToastOptions) => show('warning', title, options),
  info: (title: string, options?: ToastOptions) => show('info', title, options),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
};
