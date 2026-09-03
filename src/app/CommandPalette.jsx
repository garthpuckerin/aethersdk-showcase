import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { can } from '../access/policy';
import Dialog from '../components/Dialog';
import { Button } from '../components/ui';
import { useDemo } from '../demo/context';

export default function CommandPalette({ routes }) {
  const { state } = useDemo();
  const navigate = useNavigate();
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const availableRoutes = useMemo(() => routes.filter((route) =>
    route.nav !== false
      && can(state.activePersonaId, route.permission)
      && route.label.toLowerCase().includes(query.toLowerCase()),
  ), [query, routes, state.activePersonaId]);

  function choose(path) {
    navigate(path);
    setOpen(false);
    setQuery('');
  }

  return (
    <>
      <Button ref={triggerRef} variant="ghost" className="command-trigger" onClick={() => setOpen(true)} aria-label="Search and commands">
        <span>Search workspace</span><kbd>⌘ K</kbd>
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Search and commands" returnFocusRef={triggerRef} className="command-palette">
        <input
          autoComplete="off"
          className="command-palette__input"
          type="search"
          role="searchbox"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a surface…"
        />
        <div role="listbox" aria-label="Available routes" className="command-palette__results">
          {availableRoutes.map((route) => (
            <button key={route.path} role="option" aria-selected="false" onClick={() => choose(route.path)}>
              <span>{route.label}</span><small>{route.group}</small>
            </button>
          ))}
        </div>
      </Dialog>
    </>
  );
}
