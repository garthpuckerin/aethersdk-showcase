const LABELS = {
  healthy: 'Healthy',
  success: 'Success',
  running: 'Running',
  warning: 'Warning',
  failed: 'Failed',
  inactive: 'Inactive',
  queued: 'Queued',
};

export default function StatusBadge({ status }) {
  const label = LABELS[status] ?? status;
  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
  return (
    <span className={`status-badge status-badge--${status}`} aria-label={`Status: ${displayLabel}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {displayLabel}
    </span>
  );
}
