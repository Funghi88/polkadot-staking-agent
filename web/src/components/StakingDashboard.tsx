import { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { apiService, type StakingStatus } from '../services/api.service';
import ActionModal from './ActionModal';
import './StakingDashboard.css';

// Format balance from Planck to WND (1 WND = 10^12 Planck)
function formatBalance(planck: string): string {
  const balance = BigInt(planck);
  const wnd = Number(balance) / 1e12;
  if (wnd < 0.000001) return '< 0.000001';
  return wnd.toFixed(6).replace(/\.?0+$/, '');
}

interface StakingDashboardProps {
  onDisconnect?: () => void;
}

export default function StakingDashboard({ onDisconnect: _onDisconnect }: StakingDashboardProps) {
  const { selectedAccount, connectedChain } = useWallet();
  const [activeTab, setActiveTab] = useState<'overview' | 'actions' | 'pools'>('overview');
  const [stakingStatus, setStakingStatus] = useState<StakingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Fetch staking status when account changes
  useEffect(() => {
    if (selectedAccount?.address) {
      // Set account in API service for mock mode
      apiService.setAccount(selectedAccount.address);
      loadStakingStatus();
    } else {
      apiService.setAccount(null);
      setStakingStatus(null);
      setError(null);
    }
  }, [selectedAccount?.address]);

  const loadStakingStatus = async () => {
    if (!selectedAccount?.address) return;
    
    setLoading(true);
    setError(null);
    try {
      const status = await apiService.getStakingStatus(selectedAccount.address);
      setStakingStatus(status);
    } catch (err) {
      // Don't show error if backend is not available - just show empty state
      const errorMessage = err instanceof Error ? err.message : 'Failed to load staking status';
      if (errorMessage.includes('Backend API is not available') || errorMessage.includes('Unable to connect to the backend API')) {
        console.warn('Backend API not available - showing empty state');
        setError('Backend API server is not running. Please start it with: pnpm dev:api');
      } else if (errorMessage.includes('Failed to initialize')) {
        // Show a more helpful error for initialization failures
        setError('Unable to connect to Polkadot network. Please check your backend configuration (.env file) and ensure the API server is running with valid credentials.');
      } else {
        setError(errorMessage);
      }
      console.error('Failed to load staking status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPool = async (data: Record<string, string>) => {
    const poolId = parseInt(data.poolId);
    if (isNaN(poolId) || poolId <= 0) {
      throw new Error('Please enter a valid pool ID');
    }
    if (!data.amount || data.amount.trim() === '') {
      throw new Error('Please enter an amount (in Planck - 1 WND = 1,000,000,000,000 Planck)');
    }

    // Check balance if available
    if (stakingStatus?.balance) {
      const balance = BigInt(stakingStatus.balance);
      const amount = BigInt(data.amount.trim());
      // Reserve some for fees (approximately 0.01 WND = 10,000,000,000 Planck)
      const minReserve = BigInt('10000000000');
      
      if (balance < amount + minReserve) {
        throw new Error(
          `Insufficient balance!\n\n` +
          `Your balance: ${formatBalance(stakingStatus.balance)} WND\n` +
          `Amount needed: ${formatBalance(data.amount.trim())} WND + fees\n\n` +
          `You need testnet tokens (WND) to join a pool.\n` +
          `Get free testnet tokens from:\n` +
          `1. Matrix: #westend_faucet (send: !drip YOUR_ADDRESS)\n` +
          `2. Or visit: https://wiki.polkadot.network/docs/learn-DOT#get-testnet-tokens`
        );
      }
    }

    try {
      const result = await apiService.joinPool({
        poolId,
        amount: data.amount.trim(),
      });
      
      if (result.success) {
        await loadStakingStatus();
        const message = result.txHash 
          ? `Successfully joined pool ${poolId}!\nTransaction Hash: ${result.txHash}`
          : `Successfully joined pool ${poolId}!`;
        alert(message);
      } else {
        throw new Error(result.message || 'Failed to join pool');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join pool';
      // Provide helpful error message with troubleshooting steps
      if (errorMessage.includes('Service unavailable') || errorMessage.includes('Unable to connect') || errorMessage.includes('timeout')) {
        throw new Error(
          'Unable to connect to Polkadot network.\n\n' +
          'Possible solutions:\n' +
          '1. Check your internet connection\n' +
          '2. Check firewall/proxy settings (WebSocket connections may be blocked)\n' +
          '3. Try a different RPC endpoint in your .env file\n' +
          '4. Ensure the backend API server is running: pnpm dev:api\n' +
          '5. Check backend logs for detailed error messages\n\n' +
          'See CONNECTION_TROUBLESHOOTING.md for more help.'
        );
      }
      if (errorMessage.includes('Insufficient')) {
        // Already has helpful message about getting testnet tokens
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }
  };

  const handleBondExtra = async (data: Record<string, string>) => {
    if (!data.amount || data.amount.trim() === '') {
      throw new Error('Please enter an amount');
    }

    try {
      await apiService.bondExtra({ amount: data.amount.trim() });
      await loadStakingStatus();
      alert('Successfully bonded extra funds!');
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to bond extra');
    }
  };

  const handleUnbond = async (data: Record<string, string>) => {
    if (!data.amount || data.amount.trim() === '') {
      throw new Error('Please enter an amount');
    }

    try {
      await apiService.unbond({ amount: data.amount.trim() });
      await loadStakingStatus();
      alert('Successfully initiated unbonding!');
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to unbond');
    }
  };

  const handleWithdraw = async (_data?: Record<string, string>) => {
    try {
      await apiService.withdrawUnbonded();
      await loadStakingStatus();
      alert('Successfully withdrew unbonded funds!');
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to withdraw');
    }
  };

  const handleClaimRewards = async (data: Record<string, string>) => {
    try {
      const poolId = data.poolId && data.poolId.trim() !== '' 
        ? parseInt(data.poolId) 
        : undefined;
      
      if (poolId !== undefined && (isNaN(poolId) || poolId <= 0)) {
        throw new Error('Please enter a valid pool ID or leave it empty');
      }

      await apiService.claimRewards(poolId ? { poolId } : undefined);
      await loadStakingStatus();
      alert('Successfully claimed rewards!');
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to claim rewards');
    }
  };

  const handleGetPoolInfo = async (data: Record<string, string>) => {
    const poolId = parseInt(data.poolId);
    if (isNaN(poolId) || poolId <= 0) {
      throw new Error('Please enter a valid pool ID');
    }

    try {
      const poolInfo = await apiService.getPoolInfo({ poolId });
      // Format the pool info nicely
      let infoMessage = `Pool #${poolId} Information:\n\n`;
      infoMessage += `Bonded: ${poolInfo.bonded}\n`;
      infoMessage += `Members: ${poolInfo.memberCount}\n`;
      infoMessage += `State: ${poolInfo.state}\n`;
      if (poolInfo.commission) {
        infoMessage += `Commission: ${poolInfo.commission}\n`;
      }
      if (poolInfo.metadata) {
        infoMessage += `Metadata: ${poolInfo.metadata}\n`;
      }
      if (poolInfo.roles) {
        infoMessage += `\nRoles:\n`;
        if (poolInfo.roles.depositor) infoMessage += `  Depositor: ${poolInfo.roles.depositor}\n`;
        if (poolInfo.roles.root) infoMessage += `  Root: ${poolInfo.roles.root}\n`;
        if (poolInfo.roles.nominator) infoMessage += `  Nominator: ${poolInfo.roles.nominator}\n`;
        if (poolInfo.roles.stateToggler) infoMessage += `  State Toggler: ${poolInfo.roles.stateToggler}\n`;
      }
      
      // Show alert and let it complete before modal closes
      await new Promise<void>((resolve) => {
        alert(infoMessage);
        // Small delay to ensure alert is shown
        setTimeout(resolve, 100);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get pool info';
      // Re-throw so ActionModal can display it
      throw new Error(errorMessage);
    }
  };

  return (
    <div className="staking-dashboard">
      <div className="dashboard-header">
        <h2>Staking Dashboard</h2>
        <div className="tabs">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={activeTab === 'actions' ? 'active' : ''}
            onClick={() => setActiveTab('actions')}
          >
            Actions
          </button>
          <button
            className={activeTab === 'pools' ? 'active' : ''}
            onClick={() => setActiveTab('pools')}
            data-tab="pools"
          >
            Pools
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-header">
              <h3>Staking Status</h3>
              {selectedAccount?.address && (
                <button
                  type="button"
                  className={`refresh-btn ${loading ? 'refreshing' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    loadStakingStatus();
                  }}
                  disabled={loading}
                  title={loading ? 'Refreshing...' : 'Refresh staking status'}
                >
                  <span className={`refresh-icon ${loading ? 'spinning' : ''}`}>
                    {loading ? '⟳' : '↻'}
                  </span>
                  <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              )}
            </div>
            {loading && <div className="loading-state">Loading...</div>}
            {error && <div className="error-state">{error}</div>}
            {stakingStatus && (
              <div className="status-card">
                <div className="status-item">
                  <div className="status-label">Account</div>
                  <div className="status-value secondary">
                    {stakingStatus.account.slice(0, 10)}...{stakingStatus.account.slice(-8)}
                  </div>
                </div>
                <div className="status-item">
                  <div className="status-label">Network</div>
                  <div className="status-value secondary">{connectedChain?.name || 'Unknown'}</div>
                </div>
                <div className="status-item">
                  <div className="status-label">Balance</div>
                  <div className="status-value">
                    {stakingStatus.balance ? (
                      `${formatBalance(stakingStatus.balance)} WND`
                    ) : (
                      <span style={{ color: '#ff6b6b', fontStyle: 'italic' }}>
                        Unavailable (connection required)
                      </span>
                    )}
                  </div>
                </div>
                <div className="status-item">
                  <div className="status-label">Pool ID</div>
                  <div className="status-value">
                    {stakingStatus.poolId ? `Pool #${stakingStatus.poolId}` : 'Not in a pool'}
                  </div>
                </div>
                <div className="status-item">
                  <div className="status-label">Bonded</div>
                  <div className="status-value">
                    {stakingStatus.bonded ? `${stakingStatus.bonded} WND` : '0 WND'}
                  </div>
                </div>
                <div className="status-item">
                  <div className="status-label">Unbonding</div>
                  <div className="status-value">
                    {stakingStatus.unbonding ? `${stakingStatus.unbonding} WND` : '0 WND'}
                  </div>
                </div>
                <div className="status-item">
                  <div className="status-label">Claimable Rewards</div>
                  <div className="status-value">
                    {stakingStatus.claimableRewards ? `${stakingStatus.claimableRewards} WND` : '0 WND'}
                  </div>
                </div>
              </div>
            )}
            {!loading && !stakingStatus && !error && (
              <div className="status-card">
                <p className="info-text">Connect your wallet to view staking status</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="actions-tab">
            <h3>Staking Actions</h3>
            <div className="actions-grid">
              <ActionCard
                title="Join Pool"
                description="Add liquidity: Join a nomination pool to start staking (first time)"
                action="join"
                onAction={() => setActiveModal('join')}
                disabled={stakingStatus?.isMember}
              />
              <ActionCard
                title="Bond Extra"
                description="Add more liquidity: Increase your stake in the pool"
                action="bond"
                onAction={() => setActiveModal('bond')}
                disabled={!stakingStatus?.isMember}
              />
              <ActionCard
                title="Unbond"
                description="Initiate unbonding of staked funds"
                action="unbond"
                onAction={() => setActiveModal('unbond')}
                disabled={!stakingStatus?.isMember}
              />
              <ActionCard
                title="Withdraw"
                description="Withdraw unbonded funds"
                action="withdraw"
                onAction={() => setActiveModal('withdraw')}
              />
              <ActionCard
                title="Claim Rewards"
                description="Claim your staking rewards"
                action="claim"
                onAction={() => setActiveModal('claim')}
                disabled={!stakingStatus?.isMember}
              />
              <ActionCard
                title="Pool Info"
                description="View detailed pool information"
                action="info"
                onAction={() => setActiveModal('info')}
              />
            </div>
          </div>
        )}

        {activeTab === 'pools' && (
          <div className="pools-tab">
            <h3>Available Pools</h3>
            <p className="info-text">
              Pool browser coming soon. Use the Actions tab to interact with pools.
            </p>
          </div>
        )}
      </div>

      {/* Action Modals */}
      <ActionModal
        isOpen={activeModal === 'join'}
        onClose={() => setActiveModal(null)}
        title="Join Pool (Add Liquidity)"
        onSubmit={handleJoinPool}
              fields={[
                { name: 'poolId', label: 'Pool ID', type: 'number', placeholder: 'Enter pool ID (e.g., 1)', required: true },
                { name: 'amount', label: 'Amount (Planck)', type: 'text', placeholder: '1 WND = 10,000,000,000 Planck', required: true },
              ]}
      />

      <ActionModal
        isOpen={activeModal === 'bond'}
        onClose={() => setActiveModal(null)}
        title="Bond Extra (Add More Liquidity)"
        onSubmit={handleBondExtra}
              fields={[
                { name: 'amount', label: 'Amount (Planck)', type: 'text', placeholder: '1 WND = 10,000,000,000 Planck', required: true },
              ]}
      />

      <ActionModal
        isOpen={activeModal === 'unbond'}
        onClose={() => setActiveModal(null)}
        title="Unbond"
        onSubmit={handleUnbond}
        fields={[
          { name: 'amount', label: 'Amount (Planck)', type: 'text', placeholder: 'Enter amount to unbond', required: true },
        ]}
      />

      <ActionModal
        isOpen={activeModal === 'withdraw'}
        onClose={() => setActiveModal(null)}
        title="Withdraw Unbonded"
        onSubmit={handleWithdraw}
        fields={[]}
      />

      <ActionModal
        isOpen={activeModal === 'claim'}
        onClose={() => setActiveModal(null)}
        title="Claim Rewards"
        onSubmit={handleClaimRewards}
        fields={[
          { name: 'poolId', label: 'Pool ID (Optional)', type: 'number', placeholder: 'Leave empty for all pools', required: false },
        ]}
      />

      <ActionModal
        isOpen={activeModal === 'info'}
        onClose={() => setActiveModal(null)}
        title="Get Pool Info"
        onSubmit={handleGetPoolInfo}
        fields={[
          { name: 'poolId', label: 'Pool ID', type: 'number', placeholder: 'Enter pool ID (e.g., 1)', required: true },
        ]}
      />
    </div>
  );
}

function ActionCard({
  title,
  description,
  action: _action,
  onAction,
  disabled = false,
}: {
  title: string;
  description: string;
  action: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  const handleClick = () => {
    if (!disabled) {
      onAction();
    }
  };

  return (
    <div className={`action-card ${disabled ? 'disabled' : ''}`}>
      <h4>{title}</h4>
      <p>{description}</p>
      <button
        onClick={handleClick}
        className="action-btn"
        disabled={disabled}
        title={disabled ? 'Please connect wallet and join a pool first' : `Click to ${title.toLowerCase()}`}
      >
        {title}
      </button>
    </div>
  );
}
