const dialogKeyHandlers = [];

function handleDialogKeyDown(event) {
  dialogKeyHandlers[dialogKeyHandlers.length - 1]?.(event);
}

export function registerDialogKeyHandler(handler) {
  if (dialogKeyHandlers.length === 0) {
    document.addEventListener("keydown", handleDialogKeyDown);
  }
  dialogKeyHandlers.push(handler);

  return () => {
    const index = dialogKeyHandlers.indexOf(handler);
    const wasTopmost = index === dialogKeyHandlers.length - 1;
    if (index !== -1) dialogKeyHandlers.splice(index, 1);
    if (dialogKeyHandlers.length === 0) {
      document.removeEventListener("keydown", handleDialogKeyDown);
    }
    return wasTopmost;
  };
}

export function getFocusableElements(container) {
  if (!container) return [];
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');
  const elements = Array.from(container.querySelectorAll(selector));
  return elements.filter((el) => {
    if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
      return false;
    }
    if (typeof window !== 'undefined' && window.getComputedStyle) {
      try {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return false;
        }
      } catch {
        // Fallback
      }
    }
    return true;
  });
}
