import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './ui';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* Focus-trapped modal. The trap effect depends only on `open`: callers pass
   inline `onClose` handlers, and re-running the effect on every render would
   bounce focus between fields while someone is typing. */
export default function Dialog({ open, onClose, title, children, returnFocusRef, className = '', size }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const returnRef = useRef(returnFocusRef);
  const sizeClass = size === 'wide' ? 'dialog--wide' : '';

  useEffect(() => {
    onCloseRef.current = onClose;
    returnRef.current = returnFocusRef;
  });

  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    const previousFocus = document.activeElement;
    const focusable = () => [...panel.querySelectorAll(FOCUSABLE)];
    focusable()[0]?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const returnTarget = returnRef.current?.current ?? previousFocus;
      queueMicrotask(() => returnTarget?.focus?.());
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        ref={panelRef}
        className={`dialog ${sizeClass} ${className}`.replace(/\s+/g, ' ').trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="dialog__header">
          <h2 id={titleId}>{title}</h2>
          <IconButton label={`Close ${title}`} onClick={onClose}>×</IconButton>
        </header>
        <div className="dialog__body">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
