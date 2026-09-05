import { describe, expect, it } from 'vitest';
import {
  daysBefore,
  formatDuration,
  formatRelativeFuture,
  formatRelativeTime,
  formatUptime,
  hourLabel,
  hoursBefore,
  minutesBefore,
  minutesBetween,
  nowIso,
  shiftTimestamps,
} from './clock';

const REFERENCE = '2030-01-15T12:00:00.000Z';
const MINUTE = 60_000;

describe('clock arithmetic', () => {
  it('derives timestamps relative to an anchor', () => {
    expect(nowIso(Date.parse(REFERENCE))).toBe(REFERENCE);
    expect(minutesBefore(REFERENCE, 90)).toBe('2030-01-15T10:30:00.000Z');
    expect(hoursBefore(REFERENCE, 2)).toBe(minutesBefore(REFERENCE, 120));
    expect(daysBefore(REFERENCE, 1)).toBe(hoursBefore(REFERENCE, 24));
    expect(daysBefore(REFERENCE, -1)).toBe('2030-01-16T12:00:00.000Z');
    expect(minutesBetween(minutesBefore(REFERENCE, 45), REFERENCE)).toBe(45);
  });
});

describe('formatRelativeTime', () => {
  it('handles the boundaries between units', () => {
    expect(formatRelativeTime(null, REFERENCE)).toBe('—');
    expect(formatRelativeTime(REFERENCE, REFERENCE)).toBe('just now');
    expect(formatRelativeTime(minutesBefore(REFERENCE, 0.4), REFERENCE)).toBe('just now');
    expect(formatRelativeTime(minutesBefore(REFERENCE, 1), REFERENCE)).toBe('1m ago');
    expect(formatRelativeTime(minutesBefore(REFERENCE, 59), REFERENCE)).toBe('59m ago');
    expect(formatRelativeTime(minutesBefore(REFERENCE, 60), REFERENCE)).toBe('1h ago');
    expect(formatRelativeTime(hoursBefore(REFERENCE, 47), REFERENCE)).toBe('47h ago');
    expect(formatRelativeTime(hoursBefore(REFERENCE, 48), REFERENCE)).toBe('2d ago');
    expect(formatRelativeTime(daysBefore(REFERENCE, 30), REFERENCE)).toBe('30d ago');
  });

  it('clamps timestamps ahead of the reference to "just now"', () => {
    expect(formatRelativeTime(minutesBefore(REFERENCE, -30), REFERENCE)).toBe('just now');
  });

  it('defaults the reference to the wall clock', () => {
    expect(formatRelativeTime(new Date(Date.now() - 5 * MINUTE).toISOString())).toBe('5m ago');
  });
});

describe('formatRelativeFuture', () => {
  it('handles the boundaries between units', () => {
    expect(formatRelativeFuture(null, REFERENCE)).toBe('—');
    expect(formatRelativeFuture(minutesBefore(REFERENCE, -59), REFERENCE)).toBe('in 59m');
    expect(formatRelativeFuture(minutesBefore(REFERENCE, -60), REFERENCE)).toBe('in 1h');
    expect(formatRelativeFuture(hoursBefore(REFERENCE, -47), REFERENCE)).toBe('in 47h');
    expect(formatRelativeFuture(hoursBefore(REFERENCE, -48), REFERENCE)).toBe('in 2d');
  });

  it('clamps timestamps already behind the reference to zero', () => {
    expect(formatRelativeFuture(minutesBefore(REFERENCE, 15), REFERENCE)).toBe('in 0m');
  });
});

describe('formatDuration', () => {
  it('covers in-progress, sub-second, seconds, and minutes', () => {
    expect(formatDuration(null)).toBe('In progress');
    expect(formatDuration(undefined)).toBe('In progress');
    expect(formatDuration(0)).toBe('0 ms');
    expect(formatDuration(999)).toBe('999 ms');
    expect(formatDuration(1_000)).toBe('1.0 s');
    expect(formatDuration(1_842)).toBe('1.8 s');
    expect(formatDuration(59_949)).toBe('59.9 s');
    expect(formatDuration(60_000)).toBe('1m 0s');
    expect(formatDuration(90_500)).toBe('1m 31s');
    expect(formatDuration(3_600_000)).toBe('60m 0s');
  });
});

describe('formatUptime', () => {
  it('shows hours only under a day and days plus hours after', () => {
    expect(formatUptime(0)).toBe('0h');
    expect(formatUptime(3 * 3_600_000)).toBe('3h');
    expect(formatUptime(23 * 3_600_000 + 59 * MINUTE)).toBe('23h');
    expect(formatUptime(24 * 3_600_000)).toBe('1d 0h');
    expect(formatUptime((14 * 24 + 6) * 3_600_000)).toBe('14d 6h');
  });
});

describe('hourLabel', () => {
  it('labels the local hour on the hour', () => {
    const nineLocal = new Date(2030, 0, 15, 9, 37, 0);
    expect(hourLabel(nineLocal.toISOString())).toBe('09:00');
    const midnightLocal = new Date(2030, 0, 15, 0, 5, 0);
    expect(hourLabel(midnightLocal.toISOString())).toBe('00:00');
  });
});

describe('shiftTimestamps', () => {
  it('shifts every nested ISO string and nothing else', () => {
    const graph = {
      anchorTime: REFERENCE,
      id: 'con_ukg',
      count: 42,
      flag: true,
      nothing: null,
      dateOnly: '2030-01-15',
      lookalike: '2030-01-15T12:00:00',
      runs: { run_1: { startedAt: minutesBefore(REFERENCE, 10), completedAt: null, tags: ['sync', REFERENCE] } },
      list: [{ createdAt: '2030-01-15T11:00:00Z' }, 7, 'plain'],
    };
    const shifted = shiftTimestamps(graph, 10 * MINUTE);
    expect(shifted).toEqual({
      anchorTime: '2030-01-15T12:10:00.000Z',
      id: 'con_ukg',
      count: 42,
      flag: true,
      nothing: null,
      dateOnly: '2030-01-15',
      lookalike: '2030-01-15T12:00:00',
      runs: { run_1: { startedAt: REFERENCE, completedAt: null, tags: ['sync', '2030-01-15T12:10:00.000Z'] } },
      list: [{ createdAt: '2030-01-15T11:10:00.000Z' }, 7, 'plain'],
    });
    // Pure: the input graph is untouched.
    expect(graph.anchorTime).toBe(REFERENCE);
    expect(graph.runs.run_1.tags[1]).toBe(REFERENCE);
  });

  it('shifts backwards and by zero without altering shape', () => {
    expect(shiftTimestamps(REFERENCE, -MINUTE)).toBe('2030-01-15T11:59:00.000Z');
    expect(shiftTimestamps([REFERENCE], 0)).toEqual([REFERENCE]);
    expect(shiftTimestamps(undefined, MINUTE)).toBeUndefined();
  });
});
