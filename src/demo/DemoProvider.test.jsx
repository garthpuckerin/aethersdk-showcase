import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useDemo } from './context';
import { ACTIONS } from './reducer';
import { DemoProvider } from './DemoProvider';
import { selectOverviewMetrics } from './selectors';

function Harness() {
  const { state, dispatch } = useDemo();
  const runs = selectOverviewMetrics(state).runs.value;
  return (
    <>
      <output aria-label="run count">{runs}</output>
      <button onClick={() => dispatch({
        type: ACTIONS.START_SYNC,
        sourceConnectorId: 'con_salesforce',
        targetConnectorIds: ['con_hubspot', 'con_pipedrive'],
      })}>
        Start sync
      </button>
    </>
  );
}

describe('DemoProvider', () => {
  it('updates every consumer through one reducer state', async () => {
    const user = userEvent.setup();
    render(<DemoProvider><Harness /></DemoProvider>);
    expect(screen.getByLabelText('run count')).toHaveTextContent('24');
    await user.click(screen.getByRole('button', { name: 'Start sync' }));
    expect(screen.getByLabelText('run count')).toHaveTextContent('25');
  });
});
