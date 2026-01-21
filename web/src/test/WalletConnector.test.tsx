import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WalletConnector from '../components/WalletConnector';
import { WalletProvider } from '../hooks/useWallet';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';

// Mock the Polkadot extension
vi.mock('@polkadot/extension-dapp', () => ({
  web3Enable: vi.fn(),
  web3Accounts: vi.fn(),
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

  it('should connect wallet when button is clicked', async () => {
    vi.mocked(web3Enable).mockResolvedValue([{ name: 'polkadot-js', version: '1.0.0' } as any]);
    vi.mocked(web3Accounts).mockResolvedValue(mockAccounts as any);

    render(
      <WalletProvider>
        <WalletConnector onConnect={mockOnConnect} />
      </WalletProvider>
    );

    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    await userEvent.click(connectButton);

    await waitFor(() => {
      expect(mockOnConnect).toHaveBeenCalled();
      expect(screen.getByText('Connected Wallet')).toBeInTheDocument();
    });
  });

  it('should display wallet info when connected', async () => {
    vi.mocked(web3Enable).mockResolvedValue([{ name: 'polkadot-js', version: '1.0.0' } as any]);
    vi.mocked(web3Accounts).mockResolvedValue(mockAccounts as any);

    render(
      <WalletProvider>
        <WalletConnector onConnect={mockOnConnect} />
      </WalletProvider>
    );

    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    await userEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByText('Connected Wallet')).toBeInTheDocument();
      expect(screen.getByText(/Selected Account:/i)).toBeInTheDocument();
      expect(screen.getByText(/Connected Chain:/i)).toBeInTheDocument();
      expect(screen.getByText(/Address:/i)).toBeInTheDocument();
    });
  });

  it('should allow account selection', async () => {
    vi.mocked(web3Enable).mockResolvedValue([{ name: 'polkadot-js', version: '1.0.0' } as any]);
    vi.mocked(web3Accounts).mockResolvedValue(mockAccounts as any);

    render(
      <WalletProvider>
        <WalletConnector onConnect={mockOnConnect} />
      </WalletProvider>
    );

    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    await userEvent.click(connectButton);

    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      
      // Change selected account
      fireEvent.change(select, { target: { value: mockAccounts[1].address } });
    });
  });

  it('should disconnect wallet', async () => {
    vi.mocked(web3Enable).mockResolvedValue([{ name: 'polkadot-js', version: '1.0.0' } as any]);
    vi.mocked(web3Accounts).mockResolvedValue(mockAccounts as any);

    render(
      <WalletProvider>
        <WalletConnector onConnect={mockOnConnect} />
      </WalletProvider>
    );

    // Connect first
    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    await userEvent.click(connectButton);

    await waitFor(() => {
      expect(screen.getByText('Connected Wallet')).toBeInTheDocument();
    });

    // Then disconnect
    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    await userEvent.click(disconnectButton);

    await waitFor(() => {
      expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    });
  });

  it('should handle connection error', async () => {
    vi.mocked(web3Enable).mockResolvedValue([]);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <WalletProvider>
        <WalletConnector onConnect={mockOnConnect} />
      </WalletProvider>
    );

    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    await userEvent.click(connectButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to connect wallet. Please try again.');
    });

    alertSpy.mockRestore();
  });
});
