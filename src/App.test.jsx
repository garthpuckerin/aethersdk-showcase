import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('identifies itself as a mock portfolio demo', () => {
    render(<App />);
    expect(screen.getByText(/portfolio demo · mock data/i)).toBeInTheDocument();
  });
});
