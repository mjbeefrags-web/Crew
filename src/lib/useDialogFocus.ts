import { useEffect, useRef, type RefObject } from "react";

const SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function isFocusable(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    !element.hidden &&
    !element.closest("[inert]")
  );
}

/**
 * Modal focus management shared by dialogs and the navigation drawer:
 * focuses the first visible control, traps Tab, closes on Escape, makes the
 * rest of the app inert, and always returns focus to the opener (or an
 * explicit restore target, e.g. the menu button).
 */
export function useDialogFocus(
  open: boolean,
  onClose: () => void,
  containerRef: RefObject<HTMLElement | null>,
  restoreRef?: RefObject<HTMLElement | null>,
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const container = containerRef.current;
    const opener = (restoreRef?.current ??
      document.activeElement) as HTMLElement | null;
    const focusables = (): HTMLElement[] =>
      Array.from(
        container?.querySelectorAll<HTMLElement>(SELECTOR) ?? [],
      ).filter(isFocusable);

    // Make everything outside the dialog's top-level branch inert so screen
    // readers and Tab cannot reach the page behind it.
    const inerted: HTMLElement[] = [];
    const root = document.getElementById("root");
    let branch: HTMLElement | null = container ?? null;
    while (branch && branch.parentElement && branch.parentElement !== root) {
      branch = branch.parentElement;
    }
    if (root && branch?.parentElement === root) {
      for (const child of Array.from(root.children)) {
        if (
          child === branch ||
          child.contains(branch) ||
          branch.contains(child)
        ) {
          continue;
        }
        const element = child as HTMLElement;
        if (!element.inert) {
          element.inert = true;
          inerted.push(element);
        }
      }
    }

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!container?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      inerted.forEach((element) => {
        element.inert = false;
      });
      const target = restoreRef?.current ?? opener;
      if (target?.isConnected) target.focus();
    };
  }, [open, containerRef, restoreRef]);
}
