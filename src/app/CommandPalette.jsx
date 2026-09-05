import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { can } from '../access/policy';
import Dialog from '../components/Dialog';
import { Button } from '../components/ui';
import { useDemo } from '../demo/context';
import { selectMembers, selectSubscriptions, selectVisibleConnectors, selectVisibleRuns } from '../demo/selectors';

const RUN_LIMIT = 40;
const RESULT_LIMIT = 8;

function matches(query, ...fields) {
  return fields.some((field) => String(field ?? '').toLowerCase().includes(query));
}

/* Every searchable thing, grouped, permission-scoped, and already carrying
   the surface it opens on. Records only appear once the operator types. */
function buildGroups(state, routes, query) {
  const personaId = state.activePersonaId;
  const groups = [{
    label: 'Surfaces',
    items: routes
      .filter((route) => route.nav !== false && can(personaId, route.permission) && matches(query, route.label, route.group))
      .map((route) => ({ id: `route:${route.path}`, label: route.label, meta: route.group, to: route.path })),
  }];
  if (!query) return groups;

  if (can(personaId, 'integration:view')) {
    groups.push({
      label: 'Connectors',
      items: selectVisibleConnectors(state)
        .filter((connector) => matches(query, connector.name, connector.id, state.providerDefinitions[connector.providerDefinitionId]?.name))
        .map((connector) => ({ id: `connector:${connector.id}`, label: connector.name, meta: connector.id, to: `/app/integrations?records=${connector.id}` })),
    });
  }
  if (can(personaId, 'sync:view')) {
    groups.push({
      label: 'Sync runs',
      items: selectVisibleRuns(state).slice(0, RUN_LIMIT)
        .filter((run) => matches(query, run.id, run.operation, run.status))
        .map((run) => ({ id: `run:${run.id}`, label: run.id, meta: `${run.operation} · ${run.status}`, to: `/app/runs/${run.id}` })),
    });
  }
  if (can(personaId, 'access:view')) {
    groups.push({
      label: 'Members',
      items: selectMembers(state)
        .filter((member) => matches(query, member.name, member.email, member.roleId))
        .map((member) => ({ id: `member:${member.id}`, label: member.name, meta: member.email, to: '/app/access' })),
    });
  }
  if (can(personaId, 'webhook:view')) {
    groups.push({
      label: 'Subscriptions',
      items: selectSubscriptions(state)
        .filter((subscription) => matches(query, subscription.name, subscription.id))
        .map((subscription) => ({ id: `subscription:${subscription.id}`, label: subscription.name, meta: subscription.id, to: `/app/webhooks?records=${subscription.id}` })),
    });
  }
  return groups.map((group) => ({ ...group, items: group.items.slice(0, RESULT_LIMIT) })).filter((group) => group.items.length);
}

export default function CommandPalette({ routes }) {
  const { state } = useDemo();
  const navigate = useNavigate();
  const triggerRef = useRef(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const groups = useMemo(() => buildGroups(state, routes, query.trim().toLowerCase()), [query, routes, state]);
  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const active = flat[Math.min(activeIndex, Math.max(0, flat.length - 1))] ?? null;

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  function close() {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }

  function choose(item) {
    if (!item) return;
    navigate(item.to);
    close();
  }

  function onInputKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (flat.length ? (index + 1) % flat.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (flat.length ? (index - 1 + flat.length) % flat.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(active);
    }
  }

  return (
    <>
      <Button ref={triggerRef} variant="ghost" className="command-trigger" onClick={() => setOpen(true)} aria-label="Search and commands">
        <span>Search records and surfaces</span><kbd>⌘ K</kbd>
      </Button>
      <Dialog open={open} onClose={close} title="Search and commands" returnFocusRef={triggerRef} className="command-palette">
        <input
          autoComplete="off"
          className="command-palette__input"
          type="search"
          role="searchbox"
          aria-label="Search and commands"
          aria-controls={listId}
          aria-activedescendant={active ? `${listId}-${active.id}` : undefined}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
          onKeyDown={onInputKeyDown}
          placeholder="Surfaces, connectors, runs, members, subscriptions…"
        />
        <div id={listId} role="listbox" aria-label="Results" className="command-palette__results">
          {groups.map((group) => (
            <div key={group.label} role="group" aria-label={group.label} className="command-palette__group">
              <small aria-hidden="true">{group.label}</small>
              {group.items.map((item) => {
                const isActive = active?.id === item.id;
                return (
                  <button
                    key={item.id}
                    id={`${listId}-${item.id}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={isActive ? 'is-active' : undefined}
                    onMouseEnter={() => setActiveIndex(flat.indexOf(item))}
                    onClick={() => choose(item)}
                  >
                    <span>{item.label}</span><small>{item.meta}</small>
                  </button>
                );
              })}
            </div>
          ))}
          {!flat.length && <p className="control-stack__note">No surfaces or records match “{query}”.</p>}
        </div>
      </Dialog>
    </>
  );
}
