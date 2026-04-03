import { useEffect, useRef, type RefObject } from 'react';

const activeDialogStack: HTMLElement[] = [];
let rootBodyStyle = { overflow: '', paddingRight: '' };
let lockedBodyPaddingRight = '';
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
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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
        paddingRight: document.body.style.paddingRight
      };
    }

    activeDialogStack.push(container);

    const previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    // Lock body scroll while the dialog stack is open.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    lockedBodyPaddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : rootBodyStyle.paddingRight;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = lockedBodyPaddingRight;
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
        onCloseRef.current?.();
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
        document.body.style.overflow = rootBodyStyle.overflow;
        document.body.style.paddingRight = rootBodyStyle.paddingRight;
        document.body.classList.remove(DIALOG_OPEN_CLASS);
      } else {
        document.body.style.overflow = 'hidden';
        document.body.style.paddingRight = lockedBodyPaddingRight;
        document.body.classList.add(DIALOG_OPEN_CLASS);
      }

      if (previousActiveElement?.isConnected) {
        previousActiveElement.focus();
      }
    };
  }, [containerRef, enabled]);
};
