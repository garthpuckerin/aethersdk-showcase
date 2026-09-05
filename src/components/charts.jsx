import { useId, useRef, useState } from 'react';
import { hourLabel } from '../demo/clock';

/* Accessible throughput bar chart. One <button> per bucket so every bar is
   reachable by keyboard and screen reader; colours come from CSS custom
   properties only (see styles/features/overview.css). */

const RECENT_BUCKETS = { '24h': 6, '7d': 2, '30d': 7 };
const BUCKET_UNIT = { '24h': 'hour', '7d': 'day', '30d': 'day' };
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function bucketLabel(bucket, range) {
  if (range === '24h') return hourLabel(bucket.startIso);
  const date = new Date(bucket.startIso);
  if (range === '7d') return WEEKDAYS[date.getDay()];
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function classNames(...names) {
  return names.filter(Boolean).join(' ');
}

function formatLatency(p95) {
  return p95 == null ? '—' : `${p95.toLocaleString()} ms`;
}

export function ThroughputChart({ series, range = '24h', onSelect, ariaLabel }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const buttons = useRef([]);
  const tooltipId = useId();
  const unit = BUCKET_UNIT[range] ?? 'bucket';
  const buckets = series.map((bucket, index) => ({ ...bucket, index, label: bucketLabel(bucket, range) }));
  const max = Math.max(1, ...buckets.map(({ value }) => value));
  const peakIndex = buckets.reduce((best, bucket, index) => (bucket.value > buckets[best].value ? index : best), 0);
  const recentFrom = buckets.length - (RECENT_BUCKETS[range] ?? 0);
  const active = activeIndex != null ? buckets[activeIndex] : null;

  function focusBucket(index) {
    if (!buckets.length) return;
    const next = (index + buckets.length) % buckets.length;
    buttons.current[next]?.focus();
  }

  function onKeyDown(event, index) {
    const moves = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: buckets.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    focusBucket(moves[event.key]);
  }

  return (
    <div className="bar-chart" onMouseLeave={() => setActiveIndex(null)}>
      <div role="group" aria-label={ariaLabel ?? `Entities synced per ${unit}`} className="bar-chart__bars">
        {buckets.map((bucket) => {
          const isPeak = bucket.index === peakIndex && bucket.value > 0;
          const height = bucket.value > 0 ? Math.max(4, Math.round((bucket.value / max) * 100)) : 1;
          return (
            <button
              key={bucket.startIso}
              type="button"
              ref={(element) => { buttons.current[bucket.index] = element; }}
              className={classNames('chart-bar', bucket.index >= recentFrom && 'chart-bar--recent', isPeak && 'chart-bar--peak', bucket.index === activeIndex && 'chart-bar--active')}
              style={{ '--bar-height': `${height}%` }}
              aria-label={`${bucket.label}, ${bucket.value.toLocaleString()} entities, ${bucket.runs.toLocaleString()} runs`}
              aria-describedby={bucket.index === activeIndex ? tooltipId : undefined}
              data-record-ids={bucket.recordIds.join(',')}
              onMouseEnter={() => setActiveIndex(bucket.index)}
              onFocus={() => setActiveIndex(bucket.index)}
              onBlur={() => setActiveIndex((current) => (current === bucket.index ? null : current))}
              onKeyDown={(event) => onKeyDown(event, bucket.index)}
              onClick={() => onSelect?.(bucket)}
            >
              {isPeak && <span className="chart-bar__peak" aria-hidden="true" />}
              <span className="chart-bar__fill" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {buckets.length > 0 && (
        <div className="bar-chart__axis" aria-hidden="true">
          <span>{buckets[0].label}</span>
          <span>{buckets[Math.floor(buckets.length / 2)].label}</span>
          <span>{buckets.at(-1).label}</span>
        </div>
      )}
      {active && (
        <div id={tooltipId} role="tooltip" className="chart-tooltip" style={{ '--tooltip-left': `${((active.index + 0.5) / buckets.length) * 100}%` }}>
          <span className="chart-tooltip__label">{active.label}{active.index === peakIndex && active.value > 0 ? ' · peak' : ''}</span>
          <strong>{active.value.toLocaleString()} entities</strong>
          <span>{active.runs.toLocaleString()} runs · {active.failed.toLocaleString()} failed · p95 {formatLatency(active.p95)}</span>
        </div>
      )}
    </div>
  );
}

/* Small inline trend line for KPI cells. */
export function Sparkline({ series, label = 'Volume trend' }) {
  const width = 120;
  const height = 32;
  const max = Math.max(1, ...series.map(({ value }) => value));
  const step = series.length > 1 ? width / (series.length - 1) : 0;
  const points = series
    .map((bucket, index) => `${(index * step).toFixed(1)},${(height - 2 - (bucket.value / max) * (height - 4)).toFixed(1)}`)
    .join(' ');

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <polyline points={points} className="sparkline__line" />
    </svg>
  );
}
