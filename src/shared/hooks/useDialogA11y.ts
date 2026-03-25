import { useEffect, type RefObject } from 'react';

const activeDialogStack: HTMLElement[] = [];
let rootBodyStyle = { overflow: '', position: '', top: '', paddingRight: '' };
let savedScrollY = 0;
const DIALOG_OPEN_CLASS = 'dialog-open';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const candidates = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return candidates.filter((element) => {
    return !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true';
  });
};

export const useDialogA11y = (
  containerRef: RefObject<HTMLElement | null>,
  options?: { enabled?: boolean; onClose?: () => void }
): void => {
  const enabled = options?.enabled ?? true;
  const onClose = options?.onClose;

  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container || typeof window === 'undefined') {
      return;
    }

    const removeFromStack = () => {
      const index = activeDialogStack.lastIndexOf(container);
      if (index >= 0) {
        activeDialogStack.splice(index, 1);
      }
    };

    removeFromStack();

    if (activeDialogStack.length === 0) {
      rootBodyStyle = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        top: document.body.style.top,
        paddingRight: document.body.style.paddingRight
      };
      savedScrollY = window.scrollY;
    }

    activeDialogStack.push(container);

    const previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    // Lock body scroll and position to prevent iOS rubber-band overscroll
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    // Compensate for any scrollbar that disappeared to prevent layout shift
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.classList.add(DIALOG_OPEN_CLASS);

    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeDialogStack[activeDialogStack.length - 1] !== container) {
        return;
      }

      if (event.key === 'Escape') {
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const currentFocusableElements = getFocusableElements(container);
      if (currentFocusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = currentFocusableElements[0];
      const lastElement = currentFocusableElements[currentFocusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      removeFromStack();

      if (activeDialogStack.length === 0) {
        // Restore original body styles and scroll position
        document.body.style.overflow = rootBodyStyle.overflow;
        document.body.style.position = rootBodyStyle.position;
        document.body.style.top = rootBodyStyle.top;
        document.body.style.paddingRight = rootBodyStyle.paddingRight;
        document.body.classList.remove(DIALOG_OPEN_CLASS);
        // Restore scroll position on body (used with position:fixed)
        window.scrollTo(0, savedScrollY);
      } else {
        // Another dialog is still open; keep body locked but reset top
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${savedScrollY}px`;
        document.body.classList.add(DIALOG_OPEN_CLASS);
      }

      if (previousActiveElement?.isConnected) {
        previousActiveElement.focus();
      }
    };
  }, [containerRef, enabled, onClose]);
};
