import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock the Polkadot extension
vi.mock('@polkadot/extension-dapp', () => ({
  web3Enable: vi.fn(() => Promise.resolve([])),
  web3Accounts: vi.fn(() => Promise.resolve([])),
}));

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText(/Polkadot Staking Agent/i)).toBeInTheDocument();
  });
});
