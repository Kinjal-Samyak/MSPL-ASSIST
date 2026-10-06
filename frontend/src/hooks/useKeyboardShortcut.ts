import { useEffect } from 'react';

interface ShortcutOptions {
  ctrlOrCmd?: boolean;
  shift?: boolean;
  enabled?: boolean;
  preventDefault?: boolean;
  /** Fire even while a form field is focused (e.g. Escape-to-blur). Ctrl/Cmd shortcuts always fire regardless. */
  allowWhileTyping?: boolean;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

/**
 * Registers a global keyboard shortcut. Ignores keystrokes while the user is typing in a
 * form field unless the shortcut requires Ctrl/Cmd (so e.g. Ctrl+K still works while typing).
 */
export function useKeyboardShortcut(
  key: string,
  handler: (event: KeyboardEvent) => void,
  options: ShortcutOptions = {}
) {
  const {
    ctrlOrCmd = false,
    shift = false,
    enabled = true,
    preventDefault = true,
    allowWhileTyping = false,
  } = options;

  useEffect(() => {
    if (!enabled) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (ctrlOrCmd && !(event.ctrlKey || event.metaKey)) return;
      if (!ctrlOrCmd && (event.ctrlKey || event.metaKey)) return;
      if (shift && !event.shiftKey) return;
      if (!ctrlOrCmd && !allowWhileTyping && isTypingTarget(event.target)) return;

      if (preventDefault) event.preventDefault();
      handler(event);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ctrlOrCmd, shift, enabled, allowWhileTyping]);
}
