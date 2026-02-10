import {
  getUserPosition,
  getProtocolStats,
  getTokenPrices,
  getWalletBalances,
  getMaxMintable,
} from '@/app/actions';
import { CONTRACTS } from '@/lib/contracts';
import Header from '@/app/components/Header';
import PriceTicker from '@/app/components/PriceTicker';
import ProtocolStatsGrid from '@/app/components/ProtocolStatsGrid';
import PositionCard from '@/app/components/PositionCard';
import CollateralCard from '@/app/components/CollateralCard';
import StablecoinCard from '@/app/components/StablecoinCard';
import WalletCard from '@/app/components/WalletCard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  // Fetch all data in parallel
  const [position, stats, prices, balances, maxMintable] = await Promise.all([
    getUserPosition(),
    getProtocolStats(),
    getTokenPrices(),
    getWalletBalances(),
    getMaxMintable(),
  ]);

  const wethDepositedBalance =
    position.collateralBalances.find((b) => b.symbol === 'WETH')?.balance ?? '0';
  const wbtcDepositedBalance =
    position.collateralBalances.find((b) => b.symbol === 'WBTC')?.balance ?? '0';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      <Header />
      <PriceTicker prices={prices} />

      <main
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '28px 24px 48px',
        }}
      >
        {/* Protocol Stats */}
        <section style={{ marginBottom: '28px' }}>
          <ProtocolStatsGrid stats={stats} />
        </section>

        {/* Main content grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '360px 1fr',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          {/* Left column: Position + Wallet */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <PositionCard position={position} maxMintable={maxMintable} />
            <WalletCard balances={balances} />
          </div>

          {/* Right column: Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* How it works banner */}
            <div
              style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(99, 102, 241, 0.06))',
                border: '1px solid rgba(245, 158, 11, 0.12)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
              }}
            >
              <div style={{ fontSize: '24px', flexShrink: 0 }}>💡</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9', marginBottom: '6px' }}>
                  How it works
                </div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  {[
                    { step: '1', text: 'Deposit WETH or WBTC as collateral' },
                    { step: '2', text: 'Mint SC up to 50% of your collateral value' },
                    { step: '3', text: 'Repay debt to reclaim your collateral' },
                  ].map((item) => (
                    <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: 'rgba(245, 158, 11, 0.2)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: '700',
                          color: '#f59e0b',
                          flexShrink: 0,
                        }}
                      >
                        {item.step}
                      </div>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action panels */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
              }}
            >
              <CollateralCard
                wethBalance={balances.weth}
                wbtcBalance={balances.wbtc}
                wethDeposited={wethDepositedBalance}
                wbtcDeposited={wbtcDepositedBalance}
              />
              <StablecoinCard
                scBalance={balances.sc}
                totalDebt={position.totalDebt}
                maxMintable={maxMintable}
                stabilityFee={stats.stabilityFee}
              />
            </div>

            {/* Protocol mechanics info */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>
                  Protocol Mechanics
                </h3>
                <div style={{ flex: 1, height: '1px', background: '#1e1e2e' }} />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '12px',
                }}
              >
                {[
                  {
                    title: 'Stability Fees',
                    icon: '📈',
                    color: '#6366f1',
                    desc: `${stats.stabilityFee}% APR — dynamically adjusts based on SC peg. Increases when SC trades below $0.99, decreases above $1.01.`,
                  },
                  {
                    title: 'Liquidations',
                    icon: '🔨',
                    color: '#ef4444',
                    desc: `Positions below health factor 1.0 are eligible for liquidation via English auction. Liquidators receive ${stats.liquidationBonus}% bonus collateral.`,
                  },
                  {
                    title: 'Price Stability Module',
                    icon: '⚖️',
                    color: '#f59e0b',
                    desc: 'PSM enables 1:1 swaps between collateral tokens and SC to maintain the $1.00 peg through arbitrage.',
                  },
                  {
                    title: 'Oracle Safety',
                    icon: '🔮',
                    color: '#10b981',
                    desc: 'Hardened Chainlink oracles with 3-hour stale timeout, 30% circuit breaker, and 30-minute TWAP smoothing.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    style={{
                      padding: '12px',
                      background: '#0d0d14',
                      borderRadius: '8px',
                      border: '1px solid #1a1a24',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px' }}>{item.icon}</span>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: item.color,
                        }}
                      >
                        {item.title}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.5', margin: 0 }}>
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Contract Addresses */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>
                  Deployed Contracts
                </h3>
                <div style={{ flex: 1, height: '1px', background: '#1e1e2e' }} />
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#34d399',
                    borderRadius: '10px',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                  }}
                >
                  Anvil Chain 31337
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { label: 'StableCoin (SC)', addr: CONTRACTS.STABLE_COIN, color: '#10b981' },
                  { label: 'StableCoinEngine', addr: CONTRACTS.STABLE_COIN_ENGINE, color: '#f59e0b' },
                  { label: 'WETH Token', addr: CONTRACTS.WETH, color: '#627EEA' },
                  { label: 'WBTC Token', addr: CONTRACTS.WBTC, color: '#F7931A' },
                ].map((c) => (
                  <div
                    key={c.addr}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#0d0d14',
                      borderRadius: '6px',
                      border: '1px solid #1a1a24',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>{c.label}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--font-geist-mono)',
                        color: c.color,
                        opacity: 0.8,
                      }}
                    >
                      {c.addr.slice(0, 10)}...{c.addr.slice(-6)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid #1e1e2e',
          padding: '20px 24px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#374151',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>SC Protocol — MakerDAO-style Collateralized Stablecoin</span>
          <span>Built with Foundry · Next.js · Viem · Tailwind CSS</span>
        </div>
      </footer>
    </div>
  );
}
