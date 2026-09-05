import { useState } from 'react';
import DataState from '../../components/DataState';
import Dialog from '../../components/Dialog';
import { useDemo } from '../../demo/context';
import { ACTIONS, showcaseReducer } from '../../demo/reducer';
import { selectCatalog } from '../../demo/selectors';
import { AUTH_LABELS, label } from './labels';
import { ProviderMark } from './providerMark';

export default function AddIntegrationDialog({ open, onClose, onAdded, returnFocusRef }) {
  const { state, dispatch } = useDemo();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const catalog = selectCatalog(state);
  const categories = [...new Set(catalog.map((provider) => provider.category))];
  const needle = query.trim().toLowerCase();
  const rows = catalog.filter((provider) => (category === 'all' || provider.category === category)
    && (!needle || `${provider.name} ${provider.category} ${provider.description}`.toLowerCase().includes(needle)));

  function addProvider(provider) {
    const action = { type: ACTIONS.ADD_CONNECTOR, providerDefinitionId: provider.id };
    const connectorId = showcaseReducer(state, action).connectorOrder.at(-1);
    if (connectorId === state.connectorOrder.at(-1)) return;
    dispatch(action);
    onAdded(connectorId);
  }

  function clearFilters() {
    setQuery('');
    setCategory('all');
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add integration" className="dialog--wide" returnFocusRef={returnFocusRef}>
      <div className="catalog">
        <p className="muted">Connect a catalog adapter to this tenant. A new connector starts inactive with a missing credential reference; validate the reference and enable it from the connector drawer before it can sync.</p>
        <div className="catalog__toolbar">
          <label className="field catalog__search">
            <span className="sr-only">Search catalog</span>
            <input type="search" aria-label="Search catalog" placeholder="Search the catalog" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="chip-row" role="group" aria-label="Catalog category">
            <button type="button" className="chip" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>All</button>
            {categories.map((value) => (
              <button key={value} type="button" className="chip" aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>
            ))}
          </div>
        </div>
        {rows.length ? (
          <ul className="catalog-grid" aria-label="Catalog">
            {rows.map((provider) => (
              <li key={provider.id} className="catalog-card">
                <ProviderMark name={provider.name} />
                <div className="catalog-card__body">
                  <strong>{provider.name}</strong>
                  <span>{provider.category} · {label(AUTH_LABELS, provider.authType)}</span>
                  <p>{provider.description}</p>
                </div>
                <button type="button" className="button button--ghost button--sm" aria-label={`Add ${provider.name}`} onClick={() => addProvider(provider)}>+ Add</button>
              </li>
            ))}
          </ul>
        ) : (
          <DataState
            state="empty"
            title={catalog.length ? 'No adapters match' : 'Every catalog adapter is connected'}
            detail={catalog.length ? 'Try a different category or clear the search.' : 'This tenant already connects everything in the catalog.'}
            action={catalog.length ? <button type="button" className="button button--ghost" onClick={clearFilters}>Clear search</button> : null}
          />
        )}
      </div>
    </Dialog>
  );
}
