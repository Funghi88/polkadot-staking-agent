import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { WalletProvider, useWallet } from '../hooks/useWallet';
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

describe('useWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error when used outside WalletProvider', () => {
    expect(() => {
      renderHook(() => useWallet());
    }).toThrow('useWallet must be used within a WalletProvider');
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.accounts).toEqual([]);
    expect(result.current.selectedAccount).toBeNull();
    expect(result.current.connectedChain).toBeNull();
  });

  it('should connect wallet successfully', async () => {
    vi.mocked(web3Enable).mockResolvedValue([{ name: 'polkadot-js', version: '1.0.0' } as any]);
    vi.mocked(web3Accounts).mockResolvedValue(mockAccounts as any);

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    await act(async () => {
      await result.current.connect();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.accounts).toHaveLength(2);
      expect(result.current.selectedAccount?.address).toBe(mockAccounts[0].address);
      expect(result.current.connectedChain?.name).toBe('Westend');
    });
  });

  it('should handle connection error when no extension found', async () => {
    vi.mocked(web3Enable).mockResolvedValue([]);

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    await expect(
      act(async () => {
        await result.current.connect();
      })
    ).rejects.toThrow('No Polkadot.js extension found');
  });

  it('should handle connection error when no accounts found', async () => {
    vi.mocked(web3Enable).mockResolvedValue([{ name: 'polkadot-js', version: '1.0.0' } as any]);
    vi.mocked(web3Accounts).mockResolvedValue([]);

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    await expect(
      act(async () => {
        await result.current.connect();
      })
    ).rejects.toThrow('No accounts found');
  });

  it('should disconnect wallet', async () => {
    vi.mocked(web3Enable).mockResolvedValue([{ name: 'polkadot-js', version: '1.0.0' } as any]);
    vi.mocked(web3Accounts).mockResolvedValue(mockAccounts as any);

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    // Connect first
    await act(async () => {
      await result.current.connect();
    });

    // Then disconnect
    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.accounts).toEqual([]);
    expect(result.current.selectedAccount).toBeNull();
    expect(result.current.connectedChain).toBeNull();
  });

  it('should select account', async () => {
    vi.mocked(web3Enable).mockResolvedValue([{ name: 'polkadot-js', version: '1.0.0' } as any]);
    vi.mocked(web3Accounts).mockResolvedValue(mockAccounts as any);

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    await act(async () => {
      await result.current.connect();
    });

    const secondAccount = result.current.accounts[1];
    act(() => {
      result.current.selectAccount(secondAccount);
    });

    expect(result.current.selectedAccount?.address).toBe(secondAccount.address);
  });

  it('should switch chain', async () => {
    vi.mocked(web3Enable).mockResolvedValue([{ name: 'polkadot-js', version: '1.0.0' } as any]);
    vi.mocked(web3Accounts).mockResolvedValue(mockAccounts as any);

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    await act(async () => {
      await result.current.connect();
    });

    const newChain = { name: 'Polkadot', rpcUrl: 'wss://rpc.polkadot.io' };
    await act(async () => {
      await result.current.switchChain(newChain);
    });

    expect(result.current.connectedChain?.name).toBe('Polkadot');
    expect(result.current.connectedChain?.rpcUrl).toBe('wss://rpc.polkadot.io');
  });
});
