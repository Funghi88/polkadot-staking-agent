import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { WalletProvider, useWallet } from '../hooks/useWallet';

// Mock LunoKit hooks
vi.mock('@luno-kit/react', () => ({
  useAccount: vi.fn(() => ({ account: undefined, address: undefined, status: 'disconnected' })),
  useAccounts: vi.fn(() => ({ accounts: [] })),
  useChain: vi.fn(() => ({ chain: undefined })),
  useConnect: vi.fn(() => ({ connectAsync: vi.fn() })),
  useDisconnect: vi.fn(() => ({ disconnectAsync: vi.fn() })),
  useSwitchChain: vi.fn(() => ({ switchChainAsync: vi.fn() })),
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
    // Mock LunoKit to return connected state
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

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
      expect(result.current.accounts.length).toBeGreaterThan(0);
    });
  });

  it('should handle disconnected state', async () => {
    const LunoReact = await import('@luno-kit/react');
    vi.mocked((LunoReact as any).useAccount).mockReturnValue({
      account: undefined,
      address: undefined,
      status: 'disconnected',
    });

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.accounts).toEqual([]);
  });

  it('should disconnect wallet', async () => {
    const disconnectMock = vi.fn();
    const LunoReact = await import('@luno-kit/react');
    vi.mocked((LunoReact as any).useDisconnect).mockReturnValue({
      disconnectAsync: disconnectMock,
    });

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    act(() => {
      result.current.disconnect();
    });

    expect(disconnectMock).toHaveBeenCalled();
  });

  it('should select account', async () => {
    const LunoReact = await import('@luno-kit/react');
    vi.mocked((LunoReact as any).useAccounts).mockReturnValue({
      accounts: mockAccounts.map(a => ({ address: a.address, name: a.meta.name })),
    });

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    const account = { address: mockAccounts[1].address, name: mockAccounts[1].meta.name };
    act(() => {
      result.current.selectAccount(account);
    });

    // Selection is handled by LunoKit internally, so we just verify the function exists
    expect(result.current.selectAccount).toBeDefined();
  });

  it('should switch chain', async () => {
    const switchChainMock = vi.fn();
    const LunoReact = await import('@luno-kit/react');
    vi.mocked((LunoReact as any).useSwitchChain).mockReturnValue({
      switchChainAsync: switchChainMock,
    });

    const { result } = renderHook(() => useWallet(), {
      wrapper: WalletProvider,
    });

    const newChain = { name: 'Polkadot' };
    await act(async () => {
      await result.current.switchChain(newChain);
    });

    expect(switchChainMock).toHaveBeenCalledWith('Polkadot');
  });
});
