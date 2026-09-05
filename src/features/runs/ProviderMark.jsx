import SharedProviderMark from '../../components/ProviderMark';

/* Provider mark (vendor logo or monogram); decorative, the name beside it carries meaning. */
export default function ProviderMark(props) {
  return <SharedProviderMark {...props} />;
}

export function SystemCell({ name, providerName }) {
  return <span className="table-cell-with-mark"><ProviderMark name={providerName ?? name} /><span>{name}</span></span>;
}
