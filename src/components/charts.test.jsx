import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { hourLabel } from '../demo/clock';
import { Sparkline, ThroughputChart } from './charts';

const HOUR_MS = 3_600_000;

function buildSeries(values) {
  const start = Date.parse('2026-01-01T00:00:00.000Z');
  return values.map((value, index) => ({
    index,
    startIso: new Date(start + index * HOUR_MS).toISOString(),
    endIso: new Date(start + (index + 1) * HOUR_MS).toISOString(),
    value,
    runs: value ? 2 : 0,
    failed: index === 1 ? 1 : 0,
    recordIds: value ? [`run_${index}a`, `run_${index}b`] : [],
    p95: value ? 100 + index : null,
    successRate: value ? 50 : null,
  }));
}

function bars() {
  return [...screen.getByRole('group').querySelectorAll('button')];
}

describe('ThroughputChart', () => {
  it('renders one accessible bar per bucket inside a labelled group', () => {
    const series = buildSeries(Array.from({ length: 24 }, (_, index) => index * 10));
    render(<ThroughputChart series={series} range="24h" />);
    const group = screen.getByRole('group', { name: /entities synced per hour/i });
    expect(group.querySelectorAll('button')).toHaveLength(series.length);
    const label = hourLabel(series[5].startIso);
    expect(screen.getByRole('button', { name: `${label}, 50 entities, 2 runs` })).toHaveAttribute('data-record-ids', 'run_5a,run_5b');
  });

  it('marks the last six buckets as recent and the peak bucket with a marker', () => {
    const values = Array.from({ length: 24 }, (_, index) => (index === 10 ? 900 : index * 10));
    render(<ThroughputChart series={buildSeries(values)} range="24h" />);
    const all = bars();
    expect(all.filter((bar) => bar.classList.contains('chart-bar--recent'))).toHaveLength(6);
    expect(all.slice(-6).every((bar) => bar.classList.contains('chart-bar--recent'))).toBe(true);
    expect(all[10].classList.contains('chart-bar--peak')).toBe(true);
    expect(all.filter((bar) => bar.querySelector('.chart-bar__peak'))).toHaveLength(1);
  });

  it('moves focus with arrow keys and shows a tooltip for the focused bucket', async () => {
    const user = userEvent.setup();
    render(<ThroughputChart series={buildSeries([120, 180, 150])} range="24h" />);
    const all = bars();
    all[0].focus();
    await user.keyboard('{ArrowRight}');
    expect(all[1]).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent('180 entities');
    expect(screen.getByRole('tooltip')).toHaveTextContent('2 runs · 1 failed · p95 101 ms');
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(all[2]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(all[0]).toHaveFocus();
  });

  it('calls onSelect with the labelled bucket on click and Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const series = buildSeries([120, 180, 150]);
    render(<ThroughputChart series={series} range="24h" onSelect={onSelect} />);
    const all = bars();
    await user.click(all[1]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ index: 1, value: 180, label: hourLabel(series[1].startIso), recordIds: ['run_1a', 'run_1b'] });
    all[2].focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect.mock.calls[1][0]).toMatchObject({ index: 2, value: 150 });
  });

  it('uses weekday labels for the 7-day range', () => {
    const start = Date.parse('2026-01-04T12:00:00.000Z');
    const series = Array.from({ length: 7 }, (_, index) => ({ index, startIso: new Date(start + index * 24 * HOUR_MS).toISOString(), value: 10, runs: 1, failed: 0, recordIds: [], p95: null, successRate: 100 }));
    render(<ThroughputChart series={series} range="7d" />);
    const names = bars().map((bar) => bar.getAttribute('aria-label').split(',')[0]);
    expect(new Set(names).size).toBe(7);
    expect(names.every((name) => /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/.test(name))).toBe(true);
  });
});

describe('Sparkline', () => {
  it('renders a polyline with one point per bucket', () => {
    render(<Sparkline series={buildSeries([10, 20, 5, 40])} label="Volume, 75 entities" />);
    const svg = screen.getByRole('img', { name: 'Volume, 75 entities' });
    const points = svg.querySelector('polyline').getAttribute('points').trim().split(/\s+/);
    expect(points).toHaveLength(4);
  });
});
