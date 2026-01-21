import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { config } from '../config';
import { NetworkError } from '../utils/errors';
import { getProxyUrl } from './proxy-config';
import { SocksProxyAgent } from 'socks-proxy-agent';
import WebSocket from 'ws';
import { PolkadotAgentKit } from '@polkadot-agent-kit/sdk';

/**
 * Agent with SOCKS5 Proxy Support for QuickQ VPN
 * 
 * Uses @polkadot/api directly with SOCKS5 proxy configuration,
 * then wraps it with PolkadotAgentKit for tool compatibility.
 */
export class Agent {
  private agentKit: PolkadotAgentKit | null = null;
  private api: ApiPromise | null = null;
  private keyring: Keyring | null = null;
  private account: { address: string } | null = null;
  private initialized = false;

  constructor() {
    // Will be initialized in initialize()
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Wait for crypto to be ready
      await cryptoWaitReady();

      // Initialize keyring (Keyring expects lowercase key types)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.keyring = new Keyring({ type: config.keyType.toLowerCase() as any });
      this.account = this.keyring.addFromUri(config.privateKey);

      console.log(`🔗 Connecting to Westend testnet: ${config.rpcUrl}`);
      console.log(`📡 Account: ${this.account.address}`);

      // Check if we should use SOCKS5 proxy (QuickQ)
      const proxyUrl = getProxyUrl();
      let provider: WsProvider;

      if (proxyUrl) {
        console.log(`🔐 Using SOCKS5 proxy: ${proxyUrl}`);
        const agent = new SocksProxyAgent(proxyUrl);
        
        // Create WsProvider with SOCKS5 proxy support
        // WsProvider signatures vary across @polkadot/api versions; use a permissive cast.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        provider = new (WsProvider as any)(config.rpcUrl, undefined, undefined, {
          wsConstructor: (url: string) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return new WebSocket(url, { agent } as any);
          },
        });
      } else {
        console.log(`🌐 Direct connection (no proxy)`);
        provider = new WsProvider(config.rpcUrl);
      }

      // Create API with timeout
      const connectionTimeout = parseInt(process.env.POLKADOT_CONNECTION_TIMEOUT || '120000', 10);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Initialization timeout: Connection to Westend testnet (${config.rpcUrl}) took too long (>${connectionTimeout/1000}s)`)), connectionTimeout);
      });

      const apiPromise = ApiPromise.create({ provider });
      await Promise.race([apiPromise, timeoutPromise]);
      
      this.api = await apiPromise;
      
      // Now wrap with PolkadotAgentKit for tool compatibility
      // Pass the initialized API to avoid re-initialization
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.agentKit = new (PolkadotAgentKit as any)({
        privateKey: config.privateKey,
        keyType: config.keyType,
        rpcUrl: config.rpcUrl,
      });
      
      // Manually set the API to avoid re-initialization
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.agentKit as any).api = this.api;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.agentKit as any).account = this.account;
      
      this.initialized = true;
      console.log(`✅ Successfully connected to Westend testnet: ${config.rpcUrl}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to connect to Westend testnet (${config.rpcUrl}):`, errorMessage);
      
      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        throw new NetworkError(
          `Connection timeout to Westend testnet (${config.rpcUrl}).\n` +
          `If using QuickQ VPN, ensure SOCKS5 proxy is configured correctly.\n` +
          `Proxy detected: ${getProxyUrl() || 'none'}`,
          error
        );
      }
      
      throw new NetworkError(
        `Failed to initialize Polkadot API (Westend testnet: ${config.rpcUrl}): ${errorMessage}`,
        error
      );
    }
  }

  getAgentKit(): PolkadotAgentKit {
    if (!this.initialized || !this.agentKit) {
      throw new NetworkError('Agent not initialized. Call initialize() first.');
    }
    return this.agentKit;
  }

  getApi(): ApiPromise {
    if (!this.initialized || !this.api) {
      throw new NetworkError('Agent not initialized. Call initialize() first.');
    }
    return this.api;
  }

  async disconnect(): Promise<void> {
    if (this.api) {
      await this.api.disconnect();
      this.api = null;
      this.agentKit = null;
      this.initialized = false;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
