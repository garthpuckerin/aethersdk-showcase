import { useRef, useState } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DataState from './DataState';
import DataTable from './DataTable';
import Dialog from './Dialog';
import Drawer from './Drawer';
import StatusBadge from './StatusBadge';
import { ToastProvider, useToast } from './Toast';
import { Button } from './ui';

describe('shared primitives', () => {
  it('communicates status with text and an accessible label', () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText('Failed')).toBeVisible();
    expect(screen.getByLabelText('Status: Failed')).toBeVisible();
  });

  it.each([
    ['retrying', 'Retrying'],
    ['active', 'Active'],
    ['paused', 'Paused'],
    ['invited', 'Invited'],
    ['deprovisioned', 'Deprovisioned'],
    ['queued', 'Queued'],
  ])('labels the %s status', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByLabelText(`Status: ${label}`)).toHaveClass(`status-badge--${status}`);
  });

  it.each([
    ['loading', 'Loading records'],
    ['empty', 'No records yet'],
    ['error', 'Records unavailable'],
    ['denied', 'Permission required'],
  ])('renders the %s data state', (state, message) => {
    render(<DataState state={state} title={message} />);
    expect(screen.getByText(message)).toBeVisible();
  });

  it('applies column classes and renders an optional table footer', () => {
    render(
      <DataTable
        ariaLabel="Runs"
        columns={[{ key: 'id', label: 'Run' }, { key: 'entities', label: 'Entities', className: 'num' }]}
        rows={[{ id: 'run_1', entities: 12 }]}
        footer={<span>Showing 1 of 1</span>}
      />,
    );
    const table = screen.getByRole('table', { name: 'Runs' });
    expect(within(table).getByRole('columnheader', { name: 'Entities' })).toHaveClass('num');
    expect(within(table).getByRole('cell', { name: '12' })).toHaveClass('num');
    expect(screen.getByText('Showing 1 of 1').closest('.table-footer')).toBeInTheDocument();
  });

  it('renders the empty row when there are no records', () => {
    render(<DataTable ariaLabel="Runs" columns={[{ key: 'id', label: 'Run' }]} rows={[]} emptyMessage="No runs in this range." />);
    expect(screen.getByText('No runs in this range.')).toBeVisible();
    expect(screen.queryByText(/showing/i)).not.toBeInTheDocument();
  });

  it('closes dialogs with Escape and restores focus', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      const triggerRef = useRef(null);
      return (
        <>
          <Button ref={triggerRef} onClick={() => setOpen(true)}>Open dialog</Button>
          <Dialog open={open} onClose={() => setOpen(false)} title="Demo settings" returnFocusRef={triggerRef}>
            <Button>First action</Button>
          </Dialog>
        </>
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    expect(screen.getByRole('dialog', { name: 'Demo settings' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open dialog' })).toHaveFocus();
  });

  it('keeps focus in the field being typed in when the parent passes an inline onClose', async () => {
    const user = userEvent.setup();

    function Form() {
      const [open, setOpen] = useState(true);
      const [name, setName] = useState('');
      const [host, setHost] = useState('');
      return (
        <Dialog open={open} onClose={() => setOpen(false)} title="Add connector">
          <input aria-label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <input aria-label="Host" value={host} onChange={(event) => setHost(event.target.value)} />
        </Dialog>
      );
    }

    render(<Form />);
    await user.click(screen.getByLabelText('Host'));
    await user.keyboard('learn.example');
    expect(screen.getByLabelText('Host')).toHaveValue('learn.example');
    expect(screen.getByLabelText('Host')).toHaveFocus();
  });

  it('widens dialogs through the size prop', () => {
    render(<Dialog open onClose={() => {}} title="Add connector" size="wide"><p>Catalog</p></Dialog>);
    expect(screen.getByRole('dialog', { name: 'Add connector' })).toHaveClass('dialog--wide');
  });

  it('labels drawers and closes them with Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Drawer open onClose={onClose} title="Connector details"><p>Details</p></Drawer>);
    expect(screen.getByRole('dialog', { name: 'Connector details' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows toasts from any page and dismisses them', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    function Page() {
      const { toast } = useToast();
      return <Button onClick={() => toast('Retry queued for Axonify Frontline', 'positive')}>Retry failed target</Button>;
    }

    render(<ToastProvider durationMs={1_000}><Page /></ToastProvider>);
    await user.click(screen.getByRole('button', { name: 'Retry failed target' }));
    expect(screen.getByRole('status')).toHaveTextContent('Retry queued for Axonify Frontline');
    expect(screen.getByText('Retry queued for Axonify Frontline').closest('.toast')).toHaveClass('toast--positive');
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    await user.click(screen.getByRole('button', { name: 'Retry failed target' }));
    expect(screen.getByRole('status')).not.toBeEmptyDOMElement();
    await act(async () => { await vi.advanceTimersByTimeAsync(1_100); });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    vi.useRealTimers();
  });

  it('degrades useToast to a no-op outside a provider', () => {
    function Page() {
      const { toast } = useToast();
      return <Button onClick={() => toast('Ignored')}>Notify</Button>;
    }
    render(<Page />);
    expect(() => screen.getByRole('button', { name: 'Notify' }).click()).not.toThrow();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
