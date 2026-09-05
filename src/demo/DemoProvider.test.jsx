import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildState } from '../test/fixture-builders';
import { STAGE_DELAY_MS } from './autopilot';
import { useDemo } from './context';
import { STORAGE_KEYS } from './persistence';
import { ACTIONS, RUN_STAGES } from './reducer';
import { DemoProvider } from './DemoProvider';
import { selectOverviewMetrics } from './selectors';

function Harness() {
  const { state, dispatch, now } = useDemo();
  const ids = state.liveIds;
  const run = state.runs[ids.runId];
  return (
    <>
      <output aria-label="run count">{selectOverviewMetrics(state).runs.value}</output>
      <output aria-label="live stage">{run?.stage ?? 'none'}</output>
      <output aria-label="live status">{run?.status ?? 'none'}</output>
      <output aria-label="now">{now}</output>
      <button onClick={() => dispatch({ type: ACTIONS.START_SYNC, sourceConnectorId: ids.sourceConnectorId, targetConnectorIds: ids.targetConnectorIds })}>
        Start governed sync
      </button>
    </>
  );
}

function renderProvider(props = {}) {
  return render(<DemoProvider initialState={buildState()} {...props}><Harness /></DemoProvider>);
}

const stageOf = () => screen.getByLabelText('live stage').textContent;

describe('DemoProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('updates every consumer through one reducer state', () => {
    renderProvider({ autopilotEnabled: false });
    const before = Number(screen.getByLabelText('run count').textContent);
    fireEvent.click(screen.getByRole('button', { name: 'Start governed sync' }));
    expect(screen.getByLabelText('run count')).toHaveTextContent(String(before + 1));
    expect(stageOf()).toBe('queued');
  });

  it('advances a started live run stage by stage and stops at the fault', () => {
    renderProvider();
    fireEvent.click(screen.getByRole('button', { name: 'Start governed sync' }));
    expect(stageOf()).toBe('queued');

    const faultIndex = RUN_STAGES.indexOf('provider_write');
    for (let index = 1; index <= faultIndex; index += 1) {
      act(() => vi.advanceTimersByTime(STAGE_DELAY_MS));
      expect(stageOf()).toBe(RUN_STAGES[index]);
    }
    expect(screen.getByLabelText('live status')).toHaveTextContent('failed');

    act(() => vi.advanceTimersByTime(STAGE_DELAY_MS * 20));
    expect(stageOf()).toBe('provider_write');
    expect(screen.getByLabelText('live status')).toHaveTextContent('failed');
  });

  it('does not advance anything while the engine is disabled', () => {
    renderProvider({ autopilotEnabled: false });
    fireEvent.click(screen.getByRole('button', { name: 'Start governed sync' }));
    act(() => vi.advanceTimersByTime(STAGE_DELAY_MS * 20));
    expect(stageOf()).toBe('queued');
    expect(screen.getByLabelText('live status')).toHaveTextContent('running');
  });

  it('honours the state-level autopilot switch', () => {
    render(<DemoProvider initialState={{ ...buildState(), autopilot: false }}><Harness /></DemoProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Start governed sync' }));
    act(() => vi.advanceTimersByTime(STAGE_DELAY_MS * 20));
    expect(stageOf()).toBe('queued');
  });

  it('ticks the shared clock every 30 seconds', () => {
    renderProvider({ autopilotEnabled: false });
    const initial = screen.getByLabelText('now').textContent;
    act(() => vi.advanceTimersByTime(29_000));
    expect(screen.getByLabelText('now')).toHaveTextContent(initial);
    act(() => vi.advanceTimersByTime(1_000));
    const ticked = screen.getByLabelText('now').textContent;
    expect(ticked).not.toBe(initial);
    expect(Date.parse(ticked) - Date.parse(initial)).toBe(30_000);
    act(() => vi.advanceTimersByTime(30_000));
    expect(Date.parse(screen.getByLabelText('now').textContent) - Date.parse(initial)).toBe(60_000);
  });

  it('persists the workflow state on every change', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    renderProvider({ autopilotEnabled: false });
    const workflowWrites = () => setItem.mock.calls.filter(([key]) => key === STORAGE_KEYS.workflow);
    expect(workflowWrites()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Start governed sync' }));
    expect(workflowWrites()).toHaveLength(2);
    const persisted = JSON.parse(workflowWrites().at(-1)[1]);
    expect(persisted.state.runs[persisted.state.liveIds.runId].stage).toBe('queued');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.workflow)).state.runOrder[0]).toBe(persisted.state.liveIds.runId);
  });
});
