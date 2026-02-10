import { type WalletBalances } from '@/app/actions';
import { ANVIL_ACCOUNTS } from '@/lib/contracts';

interface WalletCardProps {
  balances: WalletBalances;
}

const TOKEN_DISPLAY = [
  {
    key: 'eth' as keyof WalletBalances,
    symbol: 'ETH',
    name: 'Ether',
    icon: 'Ξ',
    color: '#627EEA',
    bgColor: 'rgba(98, 126, 234, 0.1)',
    borderColor: 'rgba(98, 126, 234, 0.2)',
    price: 2000,
  },
  {
    key: 'weth' as keyof WalletBalances,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    icon: 'Ξ',
    color: '#7C86EA',
    bgColor: 'rgba(124, 134, 234, 0.1)',
    borderColor: 'rgba(124, 134, 234, 0.2)',
    price: 2000,
  },
  {
    key: 'wbtc' as keyof WalletBalances,
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    icon: '₿',
    color: '#F7931A',
    bgColor: 'rgba(247, 147, 26, 0.1)',
    borderColor: 'rgba(247, 147, 26, 0.2)',
    price: 30000,
  },
  {
    key: 'sc' as keyof WalletBalances,
    symbol: 'SC',
    name: 'StableCoin',
    icon: '$',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    price: 1,
  },
];

export default function WalletCard({ balances }: WalletCardProps) {
  const account = ANVIL_ACCOUNTS.deployer;
  const shortAddress = `${account.slice(0, 8)}...${account.slice(-6)}`;

  const totalUsdValue = TOKEN_DISPLAY.reduce((sum, t) => {
    return sum + parseFloat(balances[t.key]) * t.price;
  }, 0);

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>
          Wallet Balances
        </h3>
        <div
          style={{
            fontSize: '12px',
            color: '#6b7280',
            fontFamily: 'var(--font-geist-mono)',
            background: '#0d0d14',
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid #1e1e2e',
          }}
        >
          {shortAddress}
        </div>
      </div>

      {/* Total value */}
      <div
        style={{
          padding: '14px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(245, 158, 11, 0.02))',
          border: '1px solid rgba(245, 158, 11, 0.1)',
          borderRadius: '10px',
          marginBottom: '16px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
          Total Portfolio Value
        </div>
        <div style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b' }}>
          ${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Token list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {TOKEN_DISPLAY.map((t) => {
          const balance = parseFloat(balances[t.key]);
          const usdValue = balance * t.price;

          return (
            <div
              key={t.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 12px',
                background: '#0d0d14',
                borderRadius: '8px',
                border: '1px solid #1a1a24',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Token icon */}
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: t.bgColor,
                  border: `1px solid ${t.borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  color: t.color,
                  fontWeight: '700',
                  flexShrink: 0,
                }}
              >
                {t.icon}
              </div>

              {/* Token info */}
              <div style={{ flex: 1, marginLeft: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#f1f5f9' }}>{t.symbol}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>{t.name}</div>
              </div>

              {/* Balance */}
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: balance > 0 ? '#f1f5f9' : '#374151',
                    fontFamily: 'var(--font-geist-mono)',
                  }}
                >
                  {balance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: balance > 1000 ? 2 : 4,
                  })}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                  ${usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Anvil note */}
      <div
        style={{
          marginTop: '14px',
          padding: '8px 12px',
          background: 'rgba(99, 102, 241, 0.04)',
          border: '1px solid rgba(99, 102, 241, 0.1)',
          borderRadius: '6px',
          fontSize: '11px',
          color: '#4b5563',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>🔧</span>
        <span>Anvil testnet — initial allocation: 1000 WETH + 1000 WBTC to deployer</span>
      </div>
    </div>
  );
}
