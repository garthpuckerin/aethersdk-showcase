const LABELS = {
  healthy: 'Healthy',
  connected: 'Connected',
  success: 'Success',
  running: 'Running',
  warning: 'Warning',
  failed: 'Failed',
  inactive: 'Inactive',
  queued: 'Queued',
  retrying: 'Retrying',
  degraded: 'Degraded',
  active: 'Active',
  paused: 'Paused',
  invited: 'Invited',
  deprovisioned: 'Deprovisioned',
};

export default function StatusBadge({ status }) {
  const label = LABELS[status] ?? String(status ?? 'unknown');
  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
  return (
    <span className={`status-badge status-badge--${status}`} aria-label={`Status: ${displayLabel}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {displayLabel}
    </span>
  );
}
