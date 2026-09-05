import { providerInitials } from './runFormat';

/* Two-letter provider mark; decorative, the name beside it carries meaning. */
export default function ProviderMark({ name, size }) {
  return <span className={`provider-mark${size === 'lg' ? ' provider-mark--lg' : ''}`} aria-hidden="true">{providerInitials(name)}</span>;
}

export function SystemCell({ name, providerName }) {
  return <span className="table-cell-with-mark"><ProviderMark name={providerName ?? name} /><span>{name}</span></span>;
}
