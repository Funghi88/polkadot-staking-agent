import { createContext, useContext, ReactNode, useEffect } from 'react';
// LunoKit hooks - try to import directly, fallback to dynamic access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as LunoReact from '@luno-kit/react';

interface Account {
  address: string;
  name?: string;
}

interface Chain {
  name: string;
}

interface WalletContextType {
  accounts: Account[];
  selectedAccount: Account | null;
  connectedChain: Chain | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  selectAccount: (account: Account) => void;
  switchChain: (chain: Chain) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  // Try to access LunoKit hooks - they should be available when LunoKitProvider is mounted
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useAccount = (LunoReact as any).useAccount || (() => ({ address: undefined, status: 'disconnected' }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useAccounts = (LunoReact as any).useAccounts || (() => ({ accounts: [] }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useChain = (LunoReact as any).useChain || (() => ({ chain: undefined }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useDisconnect = (LunoReact as any).useDisconnect || (() => ({ disconnectAsync: async () => {} }));

  // Call hooks (must be at top level)
  const accountsState = useAccounts();
  const accountState = useAccount();
  const chainState = useChain();
  const disconnectAsync = useDisconnect();

  // Debug logging (remove in production)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useWallet] LunoKit state:', {
        accounts: accountsState?.accounts?.length || 0,
        account: accountState?.address ? 'connected' : 'disconnected',
        chain: chainState?.chain?.name || 'none',
        status: accountState?.status,
      });
      // Expand objects for detailed inspection
      console.log('[useWallet] Full accountsState:', accountsState);
      console.log('[useWallet] Full accountState:', accountState);
      console.log('[useWallet] Full chainState:', chainState);
    }
  }, [accountsState, accountState, chainState]);

  const accounts: Account[] = (accountsState?.accounts || []).map((a: any) => ({
    address: a.address,
    name: a.name || a.meta?.name || `Account ${a.address.slice(0, 8)}...`,
  }));

  const selectedAccount =
    accountState?.address
      ? { 
          address: accountState.address, 
          name: accountState.name || accountState.meta?.name || undefined 
        }
      : null;

  const connectedChain = chainState?.chain?.name ? { name: chainState.chain.name } : null;
  const isConnected = accountState?.status === 'connected' || !!accountState?.address;

  // With LunoKit, connection is driven by <ConnectButton />.
  // Keep a no-op connect() to preserve the existing app interface.
  const connect = async () => {
    console.warn('[useWallet] connect() called, but LunoKit ConnectButton should handle connection');
  };

  const disconnect = () => {
    if (disconnectAsync?.disconnectAsync) {
      void disconnectAsync.disconnectAsync();
    } else {
      console.warn('[useWallet] disconnectAsync not available');
    }
  };

  const selectAccount = (account: Account) => {
    // LunoKit selection is typically handled in UI (ConnectButton/account modal).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setActiveAccount = (LunoReact as any).useSetActiveAccount;
    if (setActiveAccount) {
      try {
        setActiveAccount(account.address);
      } catch (err) {
        console.warn('[useWallet] Failed to set active account:', err);
      }
    } else {
      console.warn('[useWallet] useSetActiveAccount not available');
    }
  };

  const switchChain = async (chain: Chain) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const useSwitchChain = (LunoReact as any).useSwitchChain;
    if (useSwitchChain) {
      const switchChainAsync = useSwitchChain();
      if (switchChainAsync?.switchChainAsync) {
        await switchChainAsync.switchChainAsync(chain.name);
      }
    } else {
      console.warn('[useWallet] useSwitchChain not available');
    }
  };

  return (
    <WalletContext.Provider
      value={{
        accounts,
        selectedAccount,
        connectedChain,
        isConnected,
        connect,
        disconnect,
        selectAccount,
        switchChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
