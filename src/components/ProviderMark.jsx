import { providerIconSrc, providerInitials } from '../demo/providerIcons';

/* Decorative provider mark: the vendor's logo when we host one, otherwise a
   two-letter monogram. The monogram stays in the DOM (visually hidden) so the
   mark reads the same to assistive tech and tests either way. */
export default function ProviderMark({ name = '', size, className = '' }) {
  const src = providerIconSrc(name);
  const sizeClass = size === 'lg' ? ' provider-mark--lg' : size === 'sm' ? ' provider-mark--sm' : '';
  const classes = `provider-mark${sizeClass}${src ? ' provider-mark--image' : ''} ${className}`.trim();
  if (!src) return <span className={classes} aria-hidden="true">{providerInitials(name)}</span>;
  return (
    <span className={classes} aria-hidden="true">
      <img src={src} alt="" loading="lazy" decoding="async" />
      <span className="sr-only">{providerInitials(name)}</span>
    </span>
  );
}
