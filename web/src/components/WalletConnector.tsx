import { useEffect, useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { ConnectButton } from '@luno-kit/ui';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as LunoReact from '@luno-kit/react';
import './WalletConnector.css';

interface WalletConnectorProps {
  onConnect: () => void;
  onDisconnect?: () => void;
}

// Manual connect button component that uses LunoKit hooks directly
function ManualConnectButton() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useConnect = (LunoReact as any).useConnect;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useConnectors = (LunoReact as any).useConnectors;
  const connectAsync = useConnect?.() || { connectAsync: async () => {} };
  const connectorsState = useConnectors?.() || { connectors: [] };
  const [isConnecting, setIsConnecting] = useState(false);

  const handleManualConnect = async (connectorId?: string) => {
    console.log('[WalletConnector] Manual connect button clicked', { connectorId });
    setIsConnecting(true);
    try {
      if (connectAsync?.connectAsync) {
        console.log('[WalletConnector] Available connectors:', connectorsState?.connectors);
        console.log('[WalletConnector] Calling connectAsync with connector:', connectorId);
        
        // Try to connect with a specific connector if provided
        const result = connectorId 
          ? await connectAsync.connectAsync({ connectorId })
          : await connectAsync.connectAsync();
          
        console.log('[WalletConnector] connectAsync completed:', result);
      } else {
        console.warn('[WalletConnector] connectAsync not available');
      }
    } catch (err) {
      console.error('[WalletConnector] Manual connect failed:', err);
      alert(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Only show in development or if ConnectButton seems broken
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const connectors = connectorsState?.connectors || [];
  
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <button
        type="button"
        onClick={() => handleManualConnect()}
        disabled={isConnecting}
        style={{
          marginBottom: '0.25rem',
          padding: '0.5rem 1rem',
          fontSize: '0.75rem',
          background: isConnecting ? '#ccc' : '#f0f0f0',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: isConnecting ? 'wait' : 'pointer',
          width: '100%',
        }}
      >
        {isConnecting ? '[Debug] Connecting...' : '[Debug] Manual Connect (Auto-select)'}
      </button>
      {connectors.length > 0 && (
        <div style={{ display: 'flex', gap: '0.25rem', flexDirection: 'column' }}>
          {connectors.map((connector: any) => (
            <button
              key={connector.id}
              type="button"
              onClick={() => handleManualConnect(connector.id)}
              disabled={isConnecting}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.7rem',
                background: '#e0e0e0',
                border: '1px solid #999',
                borderRadius: '4px',
                cursor: isConnecting ? 'wait' : 'pointer',
                width: '100%',
              }}
            >
              {isConnecting ? '...' : `[Debug] Connect ${connector.name || connector.id}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WalletConnector({ onConnect, onDisconnect }: WalletConnectorProps) {
  const {
    accounts,
    selectedAccount,
    connectedChain,
    isConnected,
    disconnect,
    selectAccount,
  } = useWallet();

  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // Prevent blank page redirects when connecting wallets
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only prevent if we're in the middle of a connection attempt
      console.log('[WalletConnector] Page unload detected - this might be a wallet redirect');
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[WalletConnector] Page hidden - wallet extension might be opening');
      } else {
        console.log('[WalletConnector] Page visible again - checking connection status');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Debug: Check if wallet extensions are available and verify CSP
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Check CSP from meta tag or headers
      const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      console.log('[WalletConnector] CSP Meta Tag:', metaCSP ? metaCSP.getAttribute('content') : 'None (using server headers)');
      
      // Check actual HTTP headers
      fetch(window.location.href, { method: 'HEAD' })
        .then(res => {
          const cspHeader = res.headers.get('Content-Security-Policy');
          console.log('[WalletConnector] CSP HTTP Header:', cspHeader || 'NONE (good!)');
        })
        .catch(err => console.warn('[WalletConnector] Could not check CSP header:', err));
      
      // Check if eval is available (CSP test) - this is the real test
      try {
        // eslint-disable-next-line no-eval
        const testResult = eval('"eval-works"');
        if (testResult === 'eval-works') {
          console.log('[WalletConnector] ✅ eval() WORKS - CSP is NOT actually blocking!');
          console.log('[WalletConnector] The CSP error in Issues tab might be a false positive');
        }
      } catch (e) {
        console.error('[WalletConnector] ❌ eval() is BLOCKED by CSP:', e);
        console.error('[WalletConnector] This will prevent wallet extensions from working!');
        console.error('[WalletConnector] SOLUTION: Restart Chrome with --disable-web-security flag');
      }
      
      const checkExtensions = () => {
        const injectedWeb3 = (window as any).injectedWeb3;
        const extensionKeys = injectedWeb3 ? Object.keys(injectedWeb3) : [];
        console.log('[WalletConnector] Available wallet extensions:', extensionKeys);
        console.log('[WalletConnector] Full injectedWeb3 object:', injectedWeb3);
        if (!injectedWeb3 || extensionKeys.length === 0) {
          console.warn('[WalletConnector] No wallet extensions detected. Make sure Polkadot.js or SubWallet is installed and enabled.');
        } else {
          console.log('[WalletConnector] ✅ Wallet extensions detected:', extensionKeys);
        }
      };
      checkExtensions();
      // Check again after a short delay in case extensions load asynchronously
      const timeout = setTimeout(checkExtensions, 1000);
      return () => clearTimeout(timeout);
    }
  }, []);

  // Debug: Log when ConnectButton is rendered
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[WalletConnector] ConnectButton rendered, isConnected:', isConnected);
    }
  }, [isConnected]);

  // LunoKit's ConnectButton owns the connect flow. We just react to state.
  useEffect(() => {
    if (isConnected) {
      setError(null);
      onConnect();
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
    // only run on state transition
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const handleDisconnect = () => {
    disconnect();
    if (onDisconnect) {
      onDisconnect();
    }
  };

  if (isConnected) {
    return (
      <div className="wallet-connector connected">
        <div className="wallet-info">
          <h3>Connected Wallet</h3>
          <div className="account-section">
            <label>Selected Account:</label>
            <select
              value={selectedAccount?.address || ''}
              onChange={(e) => {
                const account = accounts.find((a) => a.address === e.target.value);
                if (account) selectAccount(account);
              }}
            >
              {accounts.map((account) => (
                <option key={account.address} value={account.address}>
                  {account.name || account.address.slice(0, 10)}...
                  {account.address.slice(-8)}
                </option>
              ))}
            </select>
          </div>
          <div className="chain-section">
            <label>Connected Chain:</label>
            <span className="chain-name">{connectedChain?.name || 'Unknown'}</span>
          </div>
          <div className="address-section">
            <label>Address:</label>
            <div className="address-container">
              <code className="address">{selectedAccount?.address}</code>
              <button
                type="button"
                className={`copy-btn ${copySuccess ? 'copied' : ''}`}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  if (!selectedAccount?.address) {
                    console.error('No address to copy');
                    return;
                  }

                  const addressToCopy = selectedAccount.address;
                  console.log('Attempting to copy address:', addressToCopy);

                  try {
                    // Check if clipboard API is available
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(addressToCopy);
                      console.log('Address copied successfully via clipboard API');
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    } else {
                      throw new Error('Clipboard API not available');
                    }
                  } catch (err) {
                    console.warn('Clipboard API failed, trying fallback:', err);
                    // Fallback for older browsers or when clipboard API fails
                    try {
                      const textArea = document.createElement('textarea');
                      textArea.value = addressToCopy;
                      textArea.style.position = 'fixed';
                      textArea.style.top = '0';
                      textArea.style.left = '0';
                      textArea.style.width = '2em';
                      textArea.style.height = '2em';
                      textArea.style.padding = '0';
                      textArea.style.border = 'none';
                      textArea.style.outline = 'none';
                      textArea.style.boxShadow = 'none';
                      textArea.style.background = 'transparent';
                      textArea.style.opacity = '0';
                      textArea.style.zIndex = '-1';
                      
                      document.body.appendChild(textArea);
                      textArea.focus();
                      textArea.select();
                      
                      const successful = document.execCommand('copy');
                      document.body.removeChild(textArea);
                      
                      if (successful) {
                        console.log('Address copied successfully via fallback method');
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                      } else {
                        throw new Error('execCommand failed');
                      }
                    } catch (fallbackErr) {
                      console.error('All copy methods failed:', fallbackErr);
                      // Last resort: show the address in a prompt
                      const userConfirmed = window.confirm(
                        `Failed to copy automatically. Address: ${addressToCopy}\n\nClick OK to try manual copy, or Cancel to dismiss.`
                      );
                      if (userConfirmed) {
                        // Try one more time with a visible textarea
                        const visibleTextArea = document.createElement('textarea');
                        visibleTextArea.value = addressToCopy;
                        visibleTextArea.style.position = 'fixed';
                        visibleTextArea.style.top = '50%';
                        visibleTextArea.style.left = '50%';
                        visibleTextArea.style.transform = 'translate(-50%, -50%)';
                        visibleTextArea.style.zIndex = '9999';
                        document.body.appendChild(visibleTextArea);
                        visibleTextArea.select();
                        setTimeout(() => {
                          document.body.removeChild(visibleTextArea);
                        }, 1000);
                      }
                    }
                  }
                }}
                title={copySuccess ? 'Copied!' : 'Copy address to clipboard'}
                aria-label="Copy address to clipboard"
              >
                {copySuccess ? '✓' : '📋'}
              </button>
            </div>
            {copySuccess && (
              <div className="copy-success-message">Address copied to clipboard!</div>
            )}
          </div>
        </div>
        <button onClick={handleDisconnect} className="disconnect-btn">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connector">
      <h3>Connect Your Wallet</h3>
      <p>Connect your Polkadot wallet using LunoKit to get started</p>
      {error && (
        <div className="wallet-error">
          <p>{error}</p>
        </div>
      )}
      <div 
        style={{ marginTop: '1rem', position: 'relative' }}
      >
        <ConnectButton 
          onConnect={(account) => {
            console.log('[WalletConnector] ✅ ConnectButton onConnect callback:', account);
            setError(null);
          }}
          onError={(error) => {
            console.error('[WalletConnector] ❌ ConnectButton error:', error);
            const errorMsg = error?.message || error?.toString() || 'Failed to connect wallet';
            setError(`Connection failed: ${errorMsg}. Please try the manual connect button below.`);
          }}
        />
      </div>
      {/* Fallback: Manual connect using LunoKit hooks directly */}
      <ManualConnectButton />
      {process.env.NODE_ENV === 'development' && (
        <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#666', textAlign: 'center' }}>
          Debug: Check browser console for wallet extension detection
        </div>
      )}
    </div>
  );
}
