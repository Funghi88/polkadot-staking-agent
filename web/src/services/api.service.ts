/**
 * API Service for connecting frontend to backend staking operations
 * Follows the architecture pattern from ARCHITECTURE.md
 */

// Use relative URL in dev (via proxy) or absolute URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? '/api' : 'http://localhost:3001/api');

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  message: string;
}

export interface PoolInfo {
  poolId: number;
  bonded: string;
  memberCount: number;
  state: string;
  commission: string;
  metadata?: string;
  roles?: {
    depositor?: string;
    root?: string;
    nominator?: string;
    stateToggler?: string;
  };
}

export interface StakingStatus {
  account: string;
  poolId?: number;
  bonded: string;
  unbonding: string;
  claimableRewards: string;
  isMember: boolean;
  balance?: string; // Account balance in Planck
}

export interface JoinPoolParams {
  poolId: number;
  amount: string;
}

export interface BondExtraParams {
  amount: string;
}

export interface UnbondParams {
  amount: string;
}

export interface WithdrawUnbondedParams {
  numSlashingSpans?: number;
}

export interface ClaimRewardsParams {
  poolId?: number;
}

export interface GetPoolInfoParams {
  poolId: number;
}

class ApiService {
  private accountAddress: string | null = null;

  setAccount(account: string | null) {
    this.accountAddress = account;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      // Add timeout to prevent hanging requests (30 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        // Add account to query params for mock mode (if available)
        let url = `${API_BASE_URL}${endpoint}`;
        if (this.accountAddress && (endpoint.includes('/join-pool') || endpoint.includes('/bond-extra') || endpoint.includes('/unbond') || endpoint.includes('/withdraw') || endpoint.includes('/claim'))) {
          const separator = endpoint.includes('?') ? '&' : '?';
          url = `${url}${separator}account=${encodeURIComponent(this.accountAddress)}`;
        }

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        // Check if response is HTML (backend not available)
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('application/json')) {
          throw new Error('Backend API is not available. Please ensure the backend server is running.');
        }

        if (!response.ok) {
          let errorMessage = `Request failed with status ${response.status}`;
          let errorDetails: any = null;
          try {
            const error = await response.json();
            errorMessage = error.message || error.error || errorMessage;
            errorDetails = error;
          } catch {
            // If JSON parsing fails, use status text
            errorMessage = response.statusText || errorMessage;
          }
          const error = new Error(errorMessage);
          (error as any).details = errorDetails;
          throw error;
        }

        const data = await response.json();
        // Handle API response format: { success: true, data: ... } or direct data
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data.data;
        }
        return data;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('Request timeout: The request took too long. Please check your network connection and ensure the backend is running.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      if (error instanceof Error) {
        // Handle network errors (Failed to fetch)
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('Unable to connect to the backend API. Please ensure the API server is running on port 3001.');
        }
        throw error;
      }
      throw new Error('Network error: Unable to connect to the backend API');
    }
  }

  async joinPool(params: JoinPoolParams): Promise<TransactionResult> {
    return this.request<TransactionResult>('/staking/join-pool', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async bondExtra(params: BondExtraParams): Promise<TransactionResult> {
    return this.request<TransactionResult>('/staking/bond-extra', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async unbond(params: UnbondParams): Promise<TransactionResult> {
    return this.request<TransactionResult>('/staking/unbond', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async withdrawUnbonded(
    params?: WithdrawUnbondedParams
  ): Promise<TransactionResult> {
    return this.request<TransactionResult>('/staking/withdraw-unbonded', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  async claimRewards(params?: ClaimRewardsParams): Promise<TransactionResult> {
    return this.request<TransactionResult>('/staking/claim-rewards', {
      method: 'POST',
      body: JSON.stringify(params || {}),
    });
  }

  async getPoolInfo(params: GetPoolInfoParams): Promise<PoolInfo> {
    return this.request<PoolInfo>(
      `/staking/pool-info?poolId=${params.poolId}`
    );
  }

  async getStakingStatus(account: string): Promise<StakingStatus> {
    return this.request<StakingStatus>(
      `/staking/status?account=${encodeURIComponent(account)}`
    );
  }
}

export const apiService = new ApiService();
