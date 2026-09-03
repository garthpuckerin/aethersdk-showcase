import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../../demo/DemoProvider';
import { createSeedState } from '../../demo/seed';
import AccessPage from './AccessPage';

describe('AccessPage', () => {
  it('projects members, service actors, roles, permissions, and SCIM honestly', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><DemoProvider initialState={createSeedState()}><AccessPage /></DemoProvider></MemoryRouter>);
    expect(screen.getByText('Amalia Frost')).toBeVisible();
    expect(screen.getByText('Theo Park')).toBeVisible();
    expect(screen.getByText('Sync worker')).toBeVisible();
    expect(screen.getByText('Service actor')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Platform Admin' })).toBeVisible();
    expect(screen.getAllByText('connector:validate').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'SCIM provisioning' })).toBeVisible();
    expect(screen.getByText(/simulation only/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Simulate SCIM sync' }));
    expect(screen.getByText(/3 identities reconciled locally/i)).toBeVisible();
  });
});
