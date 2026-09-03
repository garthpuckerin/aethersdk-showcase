import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DataState from './DataState';
import Dialog from './Dialog';
import Drawer from './Drawer';
import StatusBadge from './StatusBadge';
import { Button } from './ui';

describe('shared primitives', () => {
  it('communicates status with text and an accessible label', () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText('Failed')).toBeVisible();
    expect(screen.getByLabelText('Status: Failed')).toBeVisible();
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

  it('labels drawers and closes them with Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Drawer open onClose={onClose} title="Connector details"><p>Details</p></Drawer>);
    expect(screen.getByRole('dialog', { name: 'Connector details' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
