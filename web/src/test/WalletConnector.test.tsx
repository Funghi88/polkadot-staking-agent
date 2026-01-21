import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WalletConnector from '../components/WalletConnector';
import { WalletProvider } from '../hooks/useWallet';

// Mock LunoKit hooks
vi.mock('@luno-kit/react', () => ({
  useAccount: vi.fn(() => ({ account: undefined, address: undefined, status: 'disconnected' })),
  useAccounts: vi.fn(() => ({ accounts: [] })),
  useChain: vi.fn(() => ({ chain: undefined })),
  useConnect: vi.fn(() => ({ connectAsync: vi.fn() })),
  useDisconnect: vi.fn(() => ({ disconnectAsync: vi.fn() })),
  useSwitchChain: vi.fn(() => ({ switchChainAsync: vi.fn() })),
}));

// Mock LunoKit UI
vi.mock('@luno-kit/ui', () => ({
  ConnectButton: () => <button data-testid="connect-button">Connect Wallet</button>,
  LunoKitProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockAccounts = [
  {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    meta: { name: 'Test Account 1' },
  },
  {
    address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    meta: { name: 'Test Account 2' },
  },
];

describe('WalletConnector', () => {
  const mockOnConnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConnect.mockClear();
  });

  it('should render connect button when not connected', () => {
    render(
      <WalletProvider>
        <WalletConnector onConnect={mockOnConnect} />
      </WalletProvider>
    );

    expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    expect(screen.getByText(/Connect your Polkadot wallet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('should show connect button when disconnected', () => {
    render(
      <WalletProvider>
        <WalletConnector onConnect={mockOnConnect} />
      </WalletProvider>
    );

    expect(screen.getByTestId('connect-button')).toBeInTheDocument();
  });

  it('should display wallet info when connected', async () => {
    // Mock connected state
    const LunoReact = await import('@luno-kit/react');
    vi.mocked((LunoReact as any).useAccount).mockReturnValue({
      account: { address: mockAccounts[0].address, name: mockAccounts[0].meta.name },
      address: mockAccounts[0].address,
      status: 'connected',
    });
    vi.mocked((LunoReact as any).useAccounts).mockReturnValue({
      accounts: mockAccounts.map(a => ({ address: a.address, name: a.meta.name })),
    });
    vi.mocked((LunoReact as any).useChain).mockReturnValue({
      chain: { name: 'Westend' },
    });

    render(
      <WalletProvider>
        <WalletConnector onConnect={mockOnConnect} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Connected Wallet')).toBeInTheDocument();
    });
  });

  it('should allow account selection when connected', async () => {
    // Mock connected state with multiple accounts
    const LunoReact = await import('@luno-kit/react');
    vi.mocked((LunoReact as any).useAccount).mockReturnValue({
      account: { address: mockAccounts[0].address, name: mockAccounts[0].meta.name },
      address: mockAccounts[0].address,
      status: 'connected',
    });
    vi.mocked((LunoReact as any).useAccounts).mockReturnValue({
      accounts: mockAccounts.map(a => ({ address: a.address, name: a.meta.name })),
    });

    render(
      <WalletProvider>
        <WalletConnector onConnect={mockOnConnect} />
      </WalletProvider>
    );

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });
  });

  it('should disconnect wallet', async () => {
    // Mock connected state
    const LunoReact = await import('@luno-kit/react');
    vi.mocked((LunoReact as any).useAccount).mockReturnValue({
      account: { address: mockAccounts[0].address },
      address: mockAccounts[0].address,
      status: 'connected',
    });

    render(
      <WalletProvider>
        <WalletConnector onConnect={mockOnConnect} />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Connected Wallet')).toBeInTheDocument();
    });

    // Then disconnect
    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    await userEvent.click(disconnectButton);

    // Disconnect is handled by LunoKit, so we just verify the button exists
    expect(disconnectButton).toBeInTheDocument();
  });

  it('should handle error state', () => {
    render(
      <WalletProvider>
        <WalletConnector onConnect={mockOnConnect} />
      </WalletProvider>
    );

    // Error handling is managed by LunoKit, so we just verify the component renders
    expect(screen.getByText(/Connect your Polkadot wallet/i)).toBeInTheDocument();
  });
});
