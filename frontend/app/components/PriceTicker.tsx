import { type TokenPrice } from '@/app/actions';

interface PriceTickerProps {
  prices: TokenPrice[];
}

const TOKEN_ICONS: Record<string, string> = {
  ETH: '⟠',
  BTC: '₿',
  SC: '$',
};

const TOKEN_COLORS: Record<string, string> = {
  ETH: '#627EEA',
  BTC: '#F7931A',
  SC: '#10b981',
};

export default function PriceTicker({ prices }: PriceTickerProps) {
  return (
    <div
      style={{
        background: '#0d0d14',
        borderBottom: '1px solid #1e1e2e',
        padding: '10px 24px',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: '#4b5563',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            flexShrink: 0,
          }}
        >
          <div
            className="live-dot"
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: '#10b981',
            }}
          />
          Live Prices
        </div>

        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
          {prices.map((price) => (
            <div
              key={price.symbol}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: `${TOKEN_COLORS[price.symbol]}20`,
                  border: `1px solid ${TOKEN_COLORS[price.symbol]}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  color: TOKEN_COLORS[price.symbol],
                  fontWeight: '700',
                }}
              >
                {TOKEN_ICONS[price.symbol]}
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  {price.symbol}
                </span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#f1f5f9', marginLeft: '6px' }}>
                  ${Number(price.price).toLocaleString('en-US', {
                    minimumFractionDigits: price.symbol === 'SC' ? 4 : 2,
                    maximumFractionDigits: price.symbol === 'SC' ? 4 : 2,
                  })}
                </span>
                {price.symbol === 'SC' && (
                  <span
                    style={{
                      marginLeft: '6px',
                      fontSize: '10px',
                      padding: '1px 6px',
                      background:
                        Math.abs(Number(price.price) - 1) < 0.01
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(239, 68, 68, 0.1)',
                      color:
                        Math.abs(Number(price.price) - 1) < 0.01 ? '#34d399' : '#f87171',
                      borderRadius: '4px',
                      border: `1px solid ${
                        Math.abs(Number(price.price) - 1) < 0.01
                          ? 'rgba(16, 185, 129, 0.2)'
                          : 'rgba(239, 68, 68, 0.2)'
                      }`,
                    }}
                  >
                    {Math.abs(Number(price.price) - 1) < 0.01 ? 'ON PEG' : 'OFF PEG'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginLeft: 'auto',
            fontSize: '11px',
            color: '#374151',
            fontFamily: 'var(--font-geist-mono)',
          }}
        >
          Chainlink Mock Oracles
        </div>
      </div>
    </div>
  );
}
