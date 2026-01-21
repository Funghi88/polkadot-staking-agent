import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock LunoKit
vi.mock('@luno-kit/react', () => ({
  useAccount: vi.fn(() => ({ account: undefined, address: undefined, status: 'disconnected' })),
  useAccounts: vi.fn(() => ({ accounts: [] })),
  useChain: vi.fn(() => ({ chain: undefined })),
  useConnect: vi.fn(() => ({ connectAsync: vi.fn() })),
  useDisconnect: vi.fn(() => ({ disconnectAsync: vi.fn() })),
  useSwitchChain: vi.fn(() => ({ switchChainAsync: vi.fn() })),
}));

vi.mock('@luno-kit/ui', () => ({
  ConnectButton: () => <button>Connect Wallet</button>,
  LunoKitProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText(/Polkadot Staking Agent/i)).toBeInTheDocument();
  });
});
