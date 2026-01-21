import { useState, useEffect } from 'react';
import WalletConnector from './components/WalletConnector';
import StakingDashboard from './components/StakingDashboard';
import { WalletProvider, useWallet } from './hooks/useWallet';
import './App.css';

function AppContent() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [userNavigatedHome, setUserNavigatedHome] = useState(false);
  const { isConnected } = useWallet();

  // Auto-show dashboard when wallet connects (only if user hasn't manually navigated home)
  useEffect(() => {
    if (isConnected && !showDashboard && !userNavigatedHome) {
      setShowDashboard(true);
    }
  }, [isConnected, showDashboard, userNavigatedHome]);

  const handleDisconnect = () => {
    setShowDashboard(false);
    setUserNavigatedHome(false);
  };

  const handleGoHome = () => {
    setShowDashboard(false);
    setUserNavigatedHome(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToDashboard = () => {
    if (!isConnected) {
      // If not connected, show message to connect first
      alert('Please connect your wallet first to access the dashboard.');
    } else {
      // Go to dashboard
      setShowDashboard(true);
      setUserNavigatedHome(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, section: string) => {
    e.preventDefault();
    if (section === 'staking') {
      if (isConnected) {
        // Go to dashboard
        setShowDashboard(true);
        setUserNavigatedHome(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('Please connect your wallet first to access the staking dashboard.');
      }
    } else if (section === 'pools') {
      if (isConnected) {
        // Go to dashboard and switch to pools tab
        setShowDashboard(true);
        setUserNavigatedHome(false);
        // Use setTimeout to ensure dashboard is rendered before switching tabs
        setTimeout(() => {
          const poolsTab = document.querySelector('[data-tab="pools"]') as HTMLElement;
          if (poolsTab) {
            poolsTab.click();
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      } else {
        alert('Please connect your wallet first to view pools.');
      }
    } else if (section === 'docs') {
      // Could link to documentation
      window.open('https://github.com/elasticlabs-org/polkadot-agent-kit', '_blank');
    }
  };

  return (
    <div className="app">
      <nav className="app-nav">
        <div className="nav-container">
          <div className="nav-brand" onClick={handleGoHome} style={{ cursor: 'pointer' }}>
            <span className="brand-icon">⚡</span>
            <span className="brand-text">Polkadot Staking</span>
          </div>
          <div className="nav-links">
            {isConnected ? (
              <>
                <button className="nav-dashboard-btn" onClick={handleGoToDashboard}>
                  Dashboard
                </button>
                <button className="nav-home-btn" onClick={handleGoHome}>
                  Home
                </button>
              </>
            ) : (
              <>
                <a href="#staking" onClick={(e) => handleNavClick(e, 'staking')}>
                  Staking
                </a>
                <a href="#pools" onClick={(e) => handleNavClick(e, 'pools')}>
                  Pools
                </a>
                <a href="#docs" onClick={(e) => handleNavClick(e, 'docs')}>
                  Docs
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {!showDashboard ? (
        <section className="hero-section" id="home">
          <div className="hero-container">
            <div className="hero-content">
              <h1 className="hero-title">
                Liquid<span className="highlight">Decentralized</span>Simple
              </h1>
              <p className="hero-subtitle">
                Staking with Polkadot Nomination Pools
              </p>
              <p className="hero-description">
                Empowering and securing Polkadot with AI-powered staking since 2024
              </p>
              <div className="hero-stats">
                <div className="stat-card">
                  <div className="stat-value">~8%</div>
                  <div className="stat-label">APR*</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">Secure</div>
                  <div className="stat-label">Non-custodial</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">Simple</div>
                  <div className="stat-label">One-click staking</div>
                </div>
              </div>
              <WalletConnector 
                onConnect={() => {
                  setShowDashboard(true);
                  setUserNavigatedHome(false);
                }} 
                onDisconnect={handleDisconnect}
              />
            </div>
          </div>
        </section>
      ) : (
        <main className="app-main" id="staking">
          <StakingDashboard onDisconnect={handleDisconnect} />
        </main>
      )}

      <footer className="app-footer">
        <div className="footer-container">
          <p>Built with @polkadot-agent-kit</p>
          <p className="footer-disclaimer">
            * APR figures are estimates, not guaranteed, and are subject to change based on network conditions.
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}

export default App;
