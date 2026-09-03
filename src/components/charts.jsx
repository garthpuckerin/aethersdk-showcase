import { useRef, useState } from 'react';

export function ThroughputChart({ title, points }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const buttons = useRef([]);
  const max = Math.max(...points.map(({ value }) => value), 1);
  const width = 640;
  const height = 180;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coordinates = points.map((point, index) => ({
    ...point,
    x: points.length > 1 ? index * step : width / 2,
    y: height - (point.value / max) * (height - 20),
  }));
  const polyline = coordinates.map(({ x, y }) => `${x},${y}`).join(' ');

  function moveFocus(index, delta) {
    const next = (index + delta + points.length) % points.length;
    setActiveIndex(next);
    buttons.current[next]?.focus();
  }

  return (
    <figure className="throughput-chart">
      <figcaption><span>{title}</span><strong>{points.reduce((sum, point) => sum + point.value, 0).toLocaleString()} entities</strong></figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} throughput trend`}>
        <title>{title} throughput trend</title>
        <line x1="0" y1={height - 1} x2={width} y2={height - 1} className="chart-grid" />
        <polyline points={polyline} className="chart-line" />
        {coordinates.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="5" className="chart-point" />)}
      </svg>
      <div className="chart-controls" aria-label={`${title} data points`}>
        {points.map((point, index) => (
          <button
            key={point.label}
            type="button"
            ref={(element) => { buttons.current[index] = element; }}
            aria-label={`${point.label}, ${point.value} entities`}
            data-record-ids={point.recordIds.join(',')}
            aria-pressed={index === activeIndex}
            onFocus={() => setActiveIndex(index)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); moveFocus(index, 1); }
              if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); moveFocus(index, -1); }
            }}
          >
            <span>{point.label}</span><strong>{point.value}</strong>
          </button>
        ))}
      </div>
      <p className="chart-live" aria-live="polite">{points[activeIndex].label} · {points[activeIndex].value} entities</p>
    </figure>
  );
}
