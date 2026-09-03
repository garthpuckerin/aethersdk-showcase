import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThroughputChart } from './charts';

const points = [
  { label: '09:00', value: 120, recordIds: ['run_1'] },
  { label: '10:00', value: 180, recordIds: ['run_2', 'run_3'] },
  { label: '11:00', value: 150, recordIds: ['run_4'] },
];

describe('ThroughputChart', () => {
  it('exposes values and contributing records without relying on color', () => {
    render(<ThroughputChart title="Entities processed" points={points} />);
    expect(screen.getByRole('img', { name: /entities processed/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /10:00, 180 entities/i })).toHaveAttribute('data-record-ids', 'run_2,run_3');
  });

  it('moves between chart points with arrow keys', async () => {
    const user = userEvent.setup();
    render(<ThroughputChart title="Entities processed" points={points} />);
    const first = screen.getByRole('button', { name: /09:00, 120 entities/i });
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /10:00, 180 entities/i })).toHaveFocus();
    expect(screen.getByText('10:00 · 180 entities')).toBeVisible();
  });
});
