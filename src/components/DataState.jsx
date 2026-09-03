const DEFAULTS = {
  loading: { title: 'Loading', detail: 'Preparing this operational view.' },
  empty: { title: 'Nothing here yet', detail: 'No records match this view.' },
  error: { title: 'Unable to load', detail: 'This simulated state can be retried safely.' },
  denied: { title: 'Permission required', detail: 'Switch persona or request the required permission.' },
};

export default function DataState({ state, title, detail, action }) {
  const copy = DEFAULTS[state] ?? DEFAULTS.empty;
  return (
    <section className={`data-state data-state--${state}`} aria-live={state === 'loading' ? 'polite' : undefined}>
      <span className="data-state__mark" aria-hidden="true" />
      <h2>{title ?? copy.title}</h2>
      <p>{detail ?? copy.detail}</p>
      {action}
    </section>
  );
}
