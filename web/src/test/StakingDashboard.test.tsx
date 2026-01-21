import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StakingDashboard from '../components/StakingDashboard';
import { WalletProvider } from '../hooks/useWallet';
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp';

// Mock the Polkadot extension
vi.mock('@polkadot/extension-dapp', () => ({
  web3Enable: vi.fn(),
  web3Accounts: vi.fn(),
}));

const mockAccount = {
  address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  meta: { name: 'Test Account' },
};

describe('StakingDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(web3Enable).mockResolvedValue([{ name: 'polkadot-js', version: '1.0.0' } as any]);
    vi.mocked(web3Accounts).mockResolvedValue([mockAccount] as any);
  });

  it('should render dashboard header with tabs', () => {
    render(
      <WalletProvider>
        <StakingDashboard />
      </WalletProvider>
    );

    expect(screen.getByText('Staking Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pools' })).toBeInTheDocument();
  });

  it('should show overview tab by default', () => {
    render(
      <WalletProvider>
        <StakingDashboard />
      </WalletProvider>
    );

    expect(screen.getByText('Staking Status')).toBeInTheDocument();
    expect(screen.getByText(/Account:/i)).toBeInTheDocument();
    expect(screen.getByText(/Chain:/i)).toBeInTheDocument();
    expect(screen.getByText(/Pool ID:/i)).toBeInTheDocument();
  });

  it('should switch to actions tab', async () => {
    render(
      <WalletProvider>
        <StakingDashboard />
      </WalletProvider>
    );

    const actionsTab = screen.getByRole('button', { name: 'Actions' });
    await userEvent.click(actionsTab);

    expect(screen.getByText('Staking Actions')).toBeInTheDocument();
    expect(screen.getAllByText('Join Pool').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bond Extra').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unbond').length).toBeGreaterThan(0);
  });

  it('should switch to pools tab', async () => {
    render(
      <WalletProvider>
        <StakingDashboard />
      </WalletProvider>
    );

    const poolsTab = screen.getByRole('button', { name: 'Pools' });
    await userEvent.click(poolsTab);

    expect(screen.getByText('Available Pools')).toBeInTheDocument();
    expect(screen.getByText(/Pool browser coming soon/i)).toBeInTheDocument();
  });

  it('should render all action cards', async () => {
    render(
      <WalletProvider>
        <StakingDashboard />
      </WalletProvider>
    );

    const actionsTab = screen.getByRole('button', { name: 'Actions' });
    await userEvent.click(actionsTab);

    const actionTitles = [
      'Join Pool',
      'Bond Extra',
      'Unbond',
      'Withdraw',
      'Claim Rewards',
      'Pool Info',
    ];

    actionTitles.forEach((title) => {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    });
  });

  it('should handle action card clicks', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <WalletProvider>
        <StakingDashboard />
      </WalletProvider>
    );

    const actionsTab = screen.getByRole('button', { name: 'Actions' });
    await userEvent.click(actionsTab);

    const joinPoolButton = screen.getByRole('button', { name: 'Join Pool' });
    await userEvent.click(joinPoolButton);

    expect(alertSpy).toHaveBeenCalledWith('Join Pool action - Coming soon!');

    alertSpy.mockRestore();
  });

  it('should highlight active tab', async () => {
    render(
      <WalletProvider>
        <StakingDashboard />
      </WalletProvider>
    );

    const overviewTab = screen.getByRole('button', { name: 'Overview' });
    const actionsTab = screen.getByRole('button', { name: 'Actions' });

    // Overview should be active by default
    expect(overviewTab.className).toContain('active');

    // Click actions tab
    await userEvent.click(actionsTab);
    expect(actionsTab.className).toContain('active');
    expect(overviewTab.className).not.toContain('active');
  });
});
