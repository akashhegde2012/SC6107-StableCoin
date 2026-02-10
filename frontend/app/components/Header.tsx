import { ANVIL_ACCOUNTS, CONTRACTS } from '@/lib/contracts';

export default function Header() {
  const account = ANVIL_ACCOUNTS.deployer;
  const shortAddress = `${account.slice(0, 6)}...${account.slice(-4)}`;

  return (
    <header
      style={{
        background: 'rgba(10, 10, 15, 0.95)',
        borderBottom: '1px solid #1e1e2e',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 24px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: '800',
              color: '#000',
            }}
          >
            S
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9', lineHeight: 1.2 }}>
              SC Protocol
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', letterSpacing: '0.05em' }}>
              COLLATERALIZED STABLECOIN
            </div>
          </div>
        </div>

        {/* Center nav */}
        <nav style={{ display: 'flex', gap: '4px' }}>
          {[
            { label: 'Dashboard', active: true },
          ].map((item) => (
            <button
              key={item.label}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: item.active ? '600' : '400',
                color: item.active ? '#f59e0b' : '#94a3b8',
                background: item.active ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right: Network + Account */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Network badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '20px',
              fontSize: '12px',
              color: '#34d399',
            }}
          >
            <div
              className="live-dot"
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
              }}
            />
            Anvil Local
          </div>

          {/* Account */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: '#111118',
              border: '1px solid #1e1e2e',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#f1f5f9',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontWeight: '600', fontSize: '13px' }}>{shortAddress}</div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Deployer</div>
            </div>
          </div>

          {/* Chain ID */}
          <div
            style={{
              padding: '5px 10px',
              background: '#111118',
              border: '1px solid #1e1e2e',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#6b7280',
              fontFamily: 'var(--font-geist-mono)',
            }}
          >
            Chain 31337
          </div>
        </div>
      </div>

      {/* Contract addresses bar */}
      <div
        style={{
          borderTop: '1px solid #1a1a26',
          background: '#0a0a10',
          padding: '6px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            gap: '24px',
            fontSize: '11px',
            color: '#4b5563',
            overflow: 'hidden',
          }}
        >
          <span>
            <span style={{ color: '#6b7280' }}>Engine:</span>{' '}
            <span style={{ fontFamily: 'var(--font-geist-mono)' }}>
              {CONTRACTS.STABLE_COIN_ENGINE.slice(0, 10)}...
            </span>
          </span>
          <span>
            <span style={{ color: '#6b7280' }}>SC Token:</span>{' '}
            <span style={{ fontFamily: 'var(--font-geist-mono)' }}>
              {CONTRACTS.STABLE_COIN.slice(0, 10)}...
            </span>
          </span>
          <span>
            <span style={{ color: '#6b7280' }}>WETH:</span>{' '}
            <span style={{ fontFamily: 'var(--font-geist-mono)' }}>
              {CONTRACTS.WETH.slice(0, 10)}...
            </span>
          </span>
          <span>
            <span style={{ color: '#6b7280' }}>WBTC:</span>{' '}
            <span style={{ fontFamily: 'var(--font-geist-mono)' }}>
              {CONTRACTS.WBTC.slice(0, 10)}...
            </span>
          </span>
          <span style={{ marginLeft: 'auto', color: '#374151' }}>
            RPC: http://127.0.0.1:8545
          </span>
        </div>
      </div>
    </header>
  );
}
