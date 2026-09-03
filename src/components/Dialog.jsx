import { useEffect, useId, useRef } from 'react';
import { IconButton } from './ui';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Dialog({ open, onClose, title, children, returnFocusRef, className = '' }) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    const previousFocus = document.activeElement;
    const returnTarget = returnFocusRef?.current ?? previousFocus;
    const focusable = () => [...panel.querySelectorAll(FOCUSABLE)];
    focusable()[0]?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
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
      queueMicrotask(() => returnTarget?.focus?.());
    };
  }, [onClose, open, returnFocusRef]);

  if (!open) return null;

  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        ref={panelRef}
        className={`dialog ${className}`.trim()}
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
    </div>
  );
}
